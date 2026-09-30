package com.leuname.lerguie.ai.vision

import android.graphics.Bitmap
import com.leuname.lerguie.core.network.LerguieApiClient
import com.leuname.lerguie.core.util.Bitmaps
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** Descrição detalhada pela IA do backend. A imagem não é armazenada no servidor. */
class CloudSceneDescriber(private val api: LerguieApiClient) : SceneDescriber {
    override suspend fun describe(image: Bitmap, mode: VisionMode): VisionResult = describe(image, mode, null)

    /** [target]: o que a pessoa está procurando (ex.: "leite"). */
    suspend fun describe(image: Bitmap, mode: VisionMode, target: String?): VisionResult {
        val jpeg = withContext(Dispatchers.Default) { Bitmaps.toJpeg(Bitmaps.scaleDown(image, if (mode == VisionMode.WALK) 768 else 1280), 82) }
        val r = api.describe(jpeg, mode.apiName, target)
        if (r.identified.isBlank()) return VisionResult.NotRecognized
        val confidence = when (r.confidence.lowercase()) {
            "high" -> Confidence.HIGH
            "medium" -> Confidence.MEDIUM
            else -> Confidence.LOW
        }
        return VisionResult.Success(
            SceneDescription(
                identified = r.identified,
                description = r.description,
                environment = r.environment,
                action = r.action,
                colors = r.colors,
                hazards = r.hazards.filter { it.isNotBlank() }.take(3),
                confidence = confidence,
                source = VisionSource.CLOUD,
            )
        )
    }
}
