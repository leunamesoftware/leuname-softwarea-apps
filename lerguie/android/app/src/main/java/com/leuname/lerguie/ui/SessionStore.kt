package com.leuname.lerguie.ui

import android.graphics.Bitmap
import com.leuname.lerguie.ai.barcode.BarcodeInfo
import com.leuname.lerguie.ai.ocr.OcrResult
import com.leuname.lerguie.ai.ocr.ReadMode
import com.leuname.lerguie.ai.memory.KnownMatch
import com.leuname.lerguie.ai.memory.MatchLevel
import com.leuname.lerguie.ai.vision.SceneSpeech
import com.leuname.lerguie.ai.vision.VisionMode
import com.leuname.lerguie.i18n.LanguagePack
import com.leuname.lerguie.ai.vision.VisionResult

data class SeeSession(
    val image: Bitmap,
    val mode: VisionMode,
    val result: VisionResult,
    val known: KnownMatch? = null,
    /** Texto escrito no objeto (OCR no aparelho), ex.: rótulo, embalagem, papel. */
    val writtenText: String? = null,
    var historyId: Long? = null,
) {
    /** Texto completo falado: alerta, objeto ensinado (se houver) e a descrição. */
    fun spokenText(pack: LanguagePack, notRecognized: String): String {
        val knownText = known?.let { if (it.level == MatchLevel.SURE) pack.knownSure(it.name) else pack.knownLikely(it.name) }
        return when (result) {
            is VisionResult.Success -> {
                val scene = result.scene
                buildList {
                    if (scene.hazards.isNotEmpty()) add(pack.attention(scene.hazards))
                    knownText?.let { add(it) }
                    add(SceneSpeech.compose(scene.copy(hazards = emptyList()), pack))
                    writtenText?.let { add(pack.writtenText(it.take(MAX_SPOKEN_TEXT))) }
                }.joinToString(" ")
            }
            else -> listOfNotNull(knownText, writtenText?.let { pack.writtenText(it.take(MAX_SPOKEN_TEXT)) })
                .joinToString(" ").ifBlank { notRecognized }
        }
    }
}

data class ReadSession(
    val image: Bitmap,
    val mode: ReadMode,
    val ocr: OcrResult?,
    val barcode: BarcodeInfo? = null,
    val productName: String? = null,
    var historyId: Long? = null,
)

private const val MAX_SPOKEN_TEXT = 400

/** Resultados em memória entre a tela de câmera e a tela de resultado. Nada é persistido aqui. */
class SessionStore {
    @Volatile var see: SeeSession? = null
    @Volatile var read: ReadSession? = null
    /** Último texto falado pelo app, para o comando "repetir". */
    @Volatile var lastSpoken: String? = null
}
