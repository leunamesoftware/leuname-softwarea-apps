package com.leuname.lerguie.ai.vision

import kotlinx.coroutines.CancellationException
import android.graphics.Bitmap
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.label.ImageLabeling
import com.google.mlkit.vision.label.defaults.ImageLabelerOptions
import com.google.mlkit.vision.objects.ObjectDetection
import com.google.mlkit.vision.objects.defaults.ObjectDetectorOptions
import com.leuname.lerguie.core.util.Bitmaps
import com.leuname.lerguie.i18n.LanguagePacks
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext

/** Análise 100% no aparelho (offline, sem custo). Mais simples que a da nuvem, mas rápida. */
class OnDeviceSceneDescriber : SceneDescriber {
    private val labeler = ImageLabeling.getClient(
        ImageLabelerOptions.Builder().setConfidenceThreshold(0.5f).build()
    )
    private val detector = ObjectDetection.getClient(
        ObjectDetectorOptions.Builder()
            .setDetectorMode(ObjectDetectorOptions.SINGLE_IMAGE_MODE)
            .enableMultipleObjects()
            .enableClassification()
            .build()
    )

    override suspend fun describe(image: Bitmap, mode: VisionMode): VisionResult = withContext(Dispatchers.Default) {
        try {
            val bmp = Bitmaps.scaleDown(image, 720)
            val input = InputImage.fromBitmap(bmp, 0)
            val labels = labeler.process(input).await().map { LabelHit(it.text, it.confidence) }
            val w = bmp.width.toFloat()
            val h = bmp.height.toFloat()
            val objects = detector.process(input).await().map { o ->
                val b = o.boundingBox
                ObjectBox(
                    category = o.labels.maxByOrNull { it.confidence }?.text,
                    left = b.left / w, top = b.top / h, right = b.right / w, bottom = b.bottom / h,
                )
            }
            OnDeviceComposer.compose(labels, objects, ColorNamer.dominantCenterColor(bmp), mode, LanguagePacks.current())
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            VisionResult.Failure(VisionNotice.ERROR)
        }
    }
}
