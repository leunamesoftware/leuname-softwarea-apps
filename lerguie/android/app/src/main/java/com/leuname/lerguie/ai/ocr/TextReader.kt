package com.leuname.lerguie.ai.ocr

import android.graphics.Bitmap
import android.graphics.Rect
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.Text
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import com.leuname.lerguie.i18n.LanguagePacks
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext

enum class ReadMode { TEXT, BOOK, DOCUMENT, PACKAGE, BARCODE }

data class OcrBlock(val id: Int, val text: String, val uncertain: Boolean)

sealed interface OcrResult {
    data class Success(val blocks: List<OcrBlock>) : OcrResult {
        val fullText: String get() = blocks.joinToString("\n\n") { it.text }
        val hasUncertainParts: Boolean get() = blocks.any { it.uncertain }
    }
    data object NoText : OcrResult
    data object Error : OcrResult
}

/** Onde está o texto no quadro — usado para orientar quem não enxerga a tela. */
enum class FramingHint { NO_TEXT, MOVE_LEFT, MOVE_RIGHT, MOVE_UP, MOVE_DOWN, MOVE_CLOSER, MOVE_AWAY, GOOD }

/**
 * OCR no aparelho (ML Kit, offline). Linhas com baixa confiança são marcadas como
 * "trecho pouco legível" em vez de serem adivinhadas.
 */
class TextReader {
    private val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)

    suspend fun read(bitmap: Bitmap): OcrResult = withContext(Dispatchers.Default) {
        try {
            val text = recognizer.process(InputImage.fromBitmap(bitmap, 0)).await()
            toResult(text)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            OcrResult.Error
        }
    }

    /** Análise leve de enquadramento a partir de um quadro da câmera. */
    suspend fun framing(image: InputImage): FramingHint {
        val text = recognizer.process(image).await()
        val boxes = text.textBlocks.mapNotNull { it.boundingBox }
        val w = if (image.rotationDegrees % 180 == 0) image.width else image.height
        val h = if (image.rotationDegrees % 180 == 0) image.height else image.width
        return FramingAdvisor.advise(boxes.map { NormBox(it, w, h) })
    }

    private fun toResult(text: Text): OcrResult {
        val unreadable = LanguagePacks.current().unreadable
        val blocks = text.textBlocks
            .sortedWith(compareBy({ it.boundingBox?.top ?: 0 }, { it.boundingBox?.left ?: 0 }))
            .mapIndexedNotNull { index, block ->
                val lines = block.lines.map { line ->
                    if (line.confidence < LOW_CONFIDENCE) unreadable else line.text
                }
                val joined = lines.joinToString("\n").replace(Regex("(${Regex.escape(unreadable)}\\n?)+"), unreadable + "\n").trim()
                if (joined.isBlank()) null else OcrBlock(index, joined, joined.contains(unreadable))
            }
        return if (blocks.isEmpty() || blocks.all { it.text == unreadable }) OcrResult.NoText else OcrResult.Success(blocks)
    }

    companion object {
        private const val LOW_CONFIDENCE = 0.45f
    }
}

data class NormBox(val left: Float, val top: Float, val right: Float, val bottom: Float) {
    constructor(r: Rect, w: Int, h: Int) : this(
        r.left / w.toFloat(), r.top / h.toFloat(), r.right / w.toFloat(), r.bottom / h.toFloat()
    )
}

object FramingAdvisor {
    fun advise(boxes: List<NormBox>): FramingHint {
        if (boxes.isEmpty()) return FramingHint.NO_TEXT
        val left = boxes.minOf { it.left }
        val right = boxes.maxOf { it.right }
        val top = boxes.minOf { it.top }
        val bottom = boxes.maxOf { it.bottom }
        val area = (right - left) * (bottom - top)
        val cx = (left + right) / 2
        val cy = (top + bottom) / 2
        return when {
            area < 0.08f -> FramingHint.MOVE_CLOSER
            left < 0.02f && right > 0.98f && (top < 0.02f || bottom > 0.98f) -> FramingHint.MOVE_AWAY
            cx < 0.35f -> FramingHint.MOVE_LEFT
            cx > 0.65f -> FramingHint.MOVE_RIGHT
            cy < 0.35f -> FramingHint.MOVE_UP
            cy > 0.65f -> FramingHint.MOVE_DOWN
            else -> FramingHint.GOOD
        }
    }
}
