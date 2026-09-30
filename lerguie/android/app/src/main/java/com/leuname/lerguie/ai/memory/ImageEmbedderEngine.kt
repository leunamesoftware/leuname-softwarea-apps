package com.leuname.lerguie.ai.memory

import android.content.Context
import android.graphics.Bitmap
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.imageembedder.ImageEmbedder

/**
 * Gera a "impressão digital" visual de uma imagem (vetor normalizado, MobileNetV3, offline).
 * Usa o centro da imagem (onde o usuário aponta) para reduzir a influência do fundo.
 */
class ImageEmbedderEngine(context: Context) {
    private val appContext = context.applicationContext
    private var embedder: ImageEmbedder? = null
    private var failed = false

    @Synchronized
    private fun get(): ImageEmbedder? {
        if (embedder == null && !failed) {
            embedder = runCatching {
                ImageEmbedder.createFromOptions(
                    appContext,
                    ImageEmbedder.ImageEmbedderOptions.builder()
                        .setBaseOptions(BaseOptions.builder().setModelAssetPath("models/image_embedder.tflite").build())
                        .setRunningMode(RunningMode.IMAGE)
                        .setL2Normalize(true)
                        .setQuantize(false)
                        .build()
                )
            }.onFailure { failed = true }.getOrNull()
        }
        return embedder
    }

    /** Executar fora da thread principal. */
    @Synchronized
    fun embed(bitmap: Bitmap): FloatArray? {
        val e = get() ?: return null
        val w = bitmap.width
        val h = bitmap.height
        val side = (minOf(w, h) * 0.8f).toInt().coerceAtLeast(1)
        val crop = Bitmap.createBitmap(bitmap, (w - side) / 2, (h - side) / 2, side, side)
            .let { if (it.config == Bitmap.Config.ARGB_8888) it else it.copy(Bitmap.Config.ARGB_8888, false) }
        return runCatching {
            e.embed(BitmapImageBuilder(crop).build()).embeddingResult().embeddings().firstOrNull()?.floatEmbedding()
        }.getOrNull()
    }
}
