package com.leuname.lerguie.ai.vision

import android.content.Context
import android.graphics.Bitmap
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.objectdetector.ObjectDetector

/** Objeto detectado com nome COCO (em inglês, traduzido pelo pacote de idioma) e caixa normalizada. */
data class Detection(val label: String, val score: Float, val box: ObjectBox)

/**
 * Detector de objetos no aparelho (MediaPipe + EfficientDet-Lite2, offline, ~80 classes).
 * Rápido o suficiente para o modo Caminhar. Não é thread-safe: acesso sincronizado.
 */
class RealtimeDetector(context: Context) {
    private val appContext = context.applicationContext
    private var detector: ObjectDetector? = null
    private var failed = false

    @Synchronized
    private fun get(): ObjectDetector? {
        if (detector == null && !failed) {
            detector = runCatching {
                ObjectDetector.createFromOptions(
                    appContext,
                    ObjectDetector.ObjectDetectorOptions.builder()
                        .setBaseOptions(BaseOptions.builder().setModelAssetPath("models/object_detector.tflite").build())
                        .setRunningMode(RunningMode.IMAGE)
                        .setMaxResults(10)
                        .setScoreThreshold(MIN_SCORE)
                        .build()
                )
            }.onFailure { failed = true }.getOrNull()
        }
        return detector
    }

    /** Executar fora da thread principal. */
    @Synchronized
    fun detect(bitmap: Bitmap): List<Detection> {
        val d = get() ?: return emptyList()
        val argb = if (bitmap.config == Bitmap.Config.ARGB_8888) bitmap else bitmap.copy(Bitmap.Config.ARGB_8888, false)
        val w = argb.width.toFloat()
        val h = argb.height.toFloat()
        return runCatching {
            d.detect(BitmapImageBuilder(argb).build()).detections().mapNotNull { det ->
                val cat = det.categories().maxByOrNull { it.score() } ?: return@mapNotNull null
                val b = det.boundingBox()
                Detection(
                    cat.categoryName(), cat.score(),
                    ObjectBox(cat.categoryName(), (b.left / w).coerceIn(0f, 1f), (b.top / h).coerceIn(0f, 1f),
                        (b.right / w).coerceIn(0f, 1f), (b.bottom / h).coerceIn(0f, 1f)),
                )
            }
        }.getOrDefault(emptyList())
    }

    companion object {
        const val MIN_SCORE = 0.4f
    }
}
