package com.leuname.lerguie.ai.vision

import android.graphics.Bitmap
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.label.ImageLabeling
import com.google.mlkit.vision.label.defaults.ImageLabelerOptions
import com.leuname.lerguie.core.util.Bitmaps
import com.leuname.lerguie.i18n.LanguagePacks
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext

/**
 * Análise 100% no aparelho (offline, sem custo): classificador de ~1000 objetos,
 * detector com posição (pessoa, veículos, móveis…) e rótulos de contexto do ML Kit.
 */
class OnDeviceSceneDescriber(
    private val detector: RealtimeDetector,
    private val classifier: ObjectClassifier,
) : SceneDescriber {
    private val labeler = ImageLabeling.getClient(
        ImageLabelerOptions.Builder().setConfidenceThreshold(0.5f).build()
    )

    override suspend fun describe(image: Bitmap, mode: VisionMode): VisionResult = withContext(Dispatchers.Default) {
        try {
            val bmp = Bitmaps.scaleDown(image, 720)
            val labels = labeler.process(InputImage.fromBitmap(bmp, 0)).await().map { LabelHit(it.text, it.confidence) }
            val detections = detector.detect(bmp)
            val classes = classifier.classify(bmp)
            OnDeviceComposer.compose(labels, detections, ColorNamer.dominantCenterColor(bmp), mode, LanguagePacks.current(), classes)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            VisionResult.Failure(VisionNotice.ERROR)
        }
    }
}
