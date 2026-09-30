package com.leuname.lerguie.ai.vision

import com.leuname.lerguie.i18n.ColorName
import com.leuname.lerguie.i18n.LanguagePack
import com.leuname.lerguie.i18n.Position

data class LabelHit(val text: String, val confidence: Float)

/** Caixa normalizada (0..1) de um objeto detectado. */
data class ObjectBox(val category: String?, val left: Float, val top: Float, val right: Float, val bottom: Float) {
    val area: Float get() = (right - left).coerceAtLeast(0f) * (bottom - top).coerceAtLeast(0f)
    val centerX: Float get() = (left + right) / 2f
}

/**
 * Regras (sem dependências Android, testáveis) que transformam as detecções do aparelho
 * em uma descrição curta e honesta, no idioma do [LanguagePack].
 */
object OnDeviceComposer {
    private const val MIN_LABEL_CONFIDENCE = 0.55f
    private const val NEAR_AREA = 0.35f
    private val vehicleLabels = setOf("Car", "Bus", "Truck", "Motorcycle", "Bicycle", "Vehicle", "Van")
    private val personLabels = setOf("Smile", "Beard", "Baby", "Crowd", "Selfie", "Team", "Hand")

    fun position(box: ObjectBox): Position = when {
        box.centerX < 0.36f -> Position.LEFT
        box.centerX > 0.64f -> Position.RIGHT
        else -> Position.FRONT
    }

    fun compose(
        labels: List<LabelHit>,
        objects: List<ObjectBox>,
        color: ColorName?,
        mode: VisionMode,
        pack: LanguagePack,
    ): VisionResult {
        val translated = labels
            .filter { it.confidence >= MIN_LABEL_CONFIDENCE }
            .sortedByDescending { it.confidence }
            .mapNotNull { hit -> pack.labels[hit.text]?.let { Triple(hit, it, hit.text) } }
            .distinctBy { it.second.name }

        if (translated.isEmpty() && objects.isEmpty()) return VisionResult.NotRecognized

        val largest = objects.maxByOrNull { it.area }
        val where = largest?.let { pack.position(position(it)) } ?: pack.position(Position.FRONT)
        val hazards = buildList {
            translated.forEach { (hit, term, _) -> if (term.hazard != null && hit.confidence >= 0.6f) add(term.hazard) }
            val vehicle = translated.any { it.third in vehicleLabels }
            if (vehicle && largest != null && largest.area >= NEAR_AREA) add(pack.vehicleNear(where))
        }.distinct()

        val primary = translated.firstOrNull()
        val personHint = translated.any { it.third in personLabels }

        val (identified, confidence) = when {
            mode == VisionMode.PERSON && personHint -> pack.personAt(where) to Confidence.MEDIUM
            primary != null -> {
                val c = primary.first.confidence
                val conf = when {
                    c >= 0.85f -> Confidence.HIGH
                    c >= 0.7f -> Confidence.MEDIUM
                    else -> Confidence.LOW
                }
                (if (conf == Confidence.HIGH) pack.sure(primary.second) else pack.likely(primary.second)) to conf
            }
            objects.size == 1 -> pack.oneObjectAt(where) to Confidence.LOW
            else -> pack.manyObjects(objects.size) to Confidence.LOW
        }

        val description = buildList {
            val others = translated.drop(1).take(3).map { it.second.name }
            if (others.isNotEmpty()) add(pack.alsoSeen(others))
            if (largest != null && primary != null) {
                val what = largest.category?.let { pack.objectCategories[it]?.withArticle }
                add(pack.objectAt(what, where, largest.area >= NEAR_AREA))
            }
        }.joinToString(" ")

        return VisionResult.Success(
            SceneDescription(
                identified = identified,
                description = description,
                colors = color?.let { pack.dominantColor(it) }.orEmpty(),
                hazards = hazards,
                confidence = confidence,
                source = VisionSource.DEVICE,
            )
        )
    }
}
