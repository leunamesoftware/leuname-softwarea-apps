package com.leuname.lerguie.ai.vision

import android.graphics.Bitmap
import com.leuname.lerguie.i18n.LanguagePack
import com.leuname.lerguie.i18n.LanguagePacks

enum class VisionMode(val apiName: String) { WALK("walk"), OBJECT("object"), PERSON("person"), ENVIRONMENT("environment") }

enum class Confidence { HIGH, MEDIUM, LOW }

enum class VisionSource { DEVICE, CLOUD }

data class SceneDescription(
    val identified: String,
    val description: String = "",
    val environment: String = "",
    val action: String = "",
    val colors: String = "",
    val hazards: List<String> = emptyList(),
    val confidence: Confidence,
    val source: VisionSource,
)

sealed interface VisionResult {
    data class Success(val scene: SceneDescription, val notice: VisionNotice? = null) : VisionResult
    /** A IA não teve confiança suficiente: não inventamos nada. */
    data object NotRecognized : VisionResult
    data class Failure(val notice: VisionNotice) : VisionResult
}

enum class VisionNotice { OFFLINE_SIMPLIFIED, CLOUD_FAILED_SIMPLIFIED, QUOTA_SIMPLIFIED, ERROR }

interface SceneDescriber {
    suspend fun describe(image: Bitmap, mode: VisionMode): VisionResult
}

/** Monta o texto falado. Perigo vem primeiro, curto e claro; incerteza é sempre dita. */
object SceneSpeech {
    fun compose(scene: SceneDescription, pack: LanguagePack = LanguagePacks.current()): String = buildList {
        if (scene.hazards.isNotEmpty()) add(pack.attention(scene.hazards))
        add(headline(scene, pack))
        if (scene.description.isNotBlank()) add(scene.description)
        if (scene.environment.isNotBlank()) add(scene.environment)
        if (scene.action.isNotBlank()) add(scene.action)
        if (scene.colors.isNotBlank()) add(scene.colors)
    }.joinToString(" ")

    fun headline(scene: SceneDescription, pack: LanguagePack = LanguagePacks.current()): String {
        val text = scene.identified.trim()
        return if (scene.confidence == Confidence.LOW && !text.startsWith(pack.uncertainPrefix)) pack.uncertain(text) else text
    }
}
