package com.leuname.lerguie.ai.vision

import android.content.Context
import android.graphics.Bitmap
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.imageclassifier.ImageClassifier

/** Classe reconhecida (índice do modelo ImageNet, traduzido pelo pacote de idioma). */
data class ClassHit(val index: Int, val score: Float)

/**
 * Reconhece o objeto para onde a câmera aponta entre ~1000 tipos (toalha, prego,
 * guarda-roupa, tesoura, garrafa...). 100% no aparelho, grátis e sem internet.
 * Analisa o centro da imagem, onde a pessoa aponta.
 */
class ObjectClassifier(context: Context) {
    private val appContext = context.applicationContext
    private var classifier: ImageClassifier? = null
    private var failed = false

    @Synchronized
    private fun get(): ImageClassifier? {
        if (classifier == null && !failed) {
            classifier = runCatching {
                ImageClassifier.createFromOptions(
                    appContext,
                    ImageClassifier.ImageClassifierOptions.builder()
                        .setBaseOptions(BaseOptions.builder().setModelAssetPath("models/image_classifier.tflite").build())
                        .setRunningMode(RunningMode.IMAGE)
                        .setMaxResults(5)
                        .setScoreThreshold(0.15f)
                        .build()
                )
            }.onFailure { failed = true }.getOrNull()
        }
        return classifier
    }

    /** Executar fora da thread principal. */
    @Synchronized
    fun classify(bitmap: Bitmap): List<ClassHit> {
        val c = get() ?: return emptyList()
        val w = bitmap.width
        val h = bitmap.height
        val side = (minOf(w, h) * 0.85f).toInt().coerceAtLeast(1)
        val crop = Bitmap.createBitmap(bitmap, (w - side) / 2, (h - side) / 2, side, side)
            .let { if (it.config == Bitmap.Config.ARGB_8888) it else it.copy(Bitmap.Config.ARGB_8888, false) }
        return runCatching {
            c.classify(BitmapImageBuilder(crop).build()).classificationResult().classifications()
                .firstOrNull()?.categories().orEmpty()
                .map { ClassHit(it.index(), it.score()) }
        }.getOrDefault(emptyList())
    }
}
