package com.leuname.lerguie.ui

import android.graphics.Bitmap
import com.leuname.lerguie.ai.barcode.BarcodeInfo
import com.leuname.lerguie.ai.ocr.OcrResult
import com.leuname.lerguie.ai.ocr.ReadMode
import com.leuname.lerguie.ai.vision.VisionMode
import com.leuname.lerguie.ai.vision.VisionResult

data class SeeSession(val image: Bitmap, val mode: VisionMode, val result: VisionResult, var historyId: Long? = null)

data class ReadSession(
    val image: Bitmap,
    val mode: ReadMode,
    val ocr: OcrResult?,
    val barcode: BarcodeInfo? = null,
    val productName: String? = null,
    var historyId: Long? = null,
)

/** Resultados em memória entre a tela de câmera e a tela de resultado. Nada é persistido aqui. */
class SessionStore {
    @Volatile var see: SeeSession? = null
    @Volatile var read: ReadSession? = null
    /** Último texto falado pelo app, para o comando "repetir". */
    @Volatile var lastSpoken: String? = null
}
