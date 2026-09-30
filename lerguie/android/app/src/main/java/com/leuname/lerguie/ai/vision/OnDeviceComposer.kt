package com.leuname.lerguie.ai.vision

import com.leuname.lerguie.i18n.ColorName
import com.leuname.lerguie.i18n.LanguagePack
import com.leuname.lerguie.i18n.Position
import com.leuname.lerguie.i18n.Proximity

data class LabelHit(val text: String, val confidence: Float)

/** Caixa normalizada (0..1) de um objeto detectado. */
data class ObjectBox(val category: String?, val left: Float, val top: Float, val right: Float, val bottom: Float) {
    val area: Float get() = (right - left).coerceAtLeast(0f) * (bottom - top).coerceAtLeast(0f)
    val width: Float get() = (right - left).coerceAtLeast(0f)
    val height: Float get() = (bottom - top).coerceAtLeast(0f)
    val centerX: Float get() = (left + right) / 2f
}

/**
 * Regras (sem dependências Android, testáveis) que transformam as detecções do aparelho
 * em uma descrição curta e honesta, no idioma do [LanguagePack].
 * Detecções do detector em tempo real (nome + posição) têm prioridade sobre rótulos gerais.
 */
object OnDeviceComposer {
    // Limiares altos de propósito: no aparelho é melhor calar do que afirmar errado.
    private const val MIN_LABEL_CONFIDENCE = 0.7f
    private const val MIN_DETECTION_SCORE = 0.55f
    private const val MIN_HAZARD_SCORE = 0.7f
    private const val MIN_CLASS_SCORE = 0.3f
    val vehicles = setOf("car", "motorcycle", "bus", "truck", "bicycle", "train")

    fun position(box: ObjectBox): Position = when {
        box.centerX < 0.36f -> Position.LEFT
        box.centerX > 0.64f -> Position.RIGHT
        else -> Position.FRONT
    }

    /** Proximidade aproximada pelo tamanho na imagem (não é medida de distância exata). */
    fun proximity(box: ObjectBox): Proximity = when {
        box.height > 0.6f || box.area > 0.3f -> Proximity.NEAR
        box.height > 0.3f || box.area > 0.08f -> Proximity.MEDIUM
        else -> Proximity.FAR
    }

    /** Ordem de importância: veículos e pessoas antes, depois o que estiver mais perto. */
    fun rank(detections: List<Detection>): List<Detection> = detections.sortedWith(
        compareBy<Detection> {
            when {
                it.label in vehicles -> 0
                it.label == "person" -> 1
                else -> 2
            }
        }.thenByDescending { it.box.area }
    )

    fun compose(
        labels: List<LabelHit>,
        detections: List<Detection>,
        color: ColorName?,
        mode: VisionMode,
        pack: LanguagePack,
        classes: List<ClassHit> = emptyList(),
    ): VisionResult {
        val ranked = rank(detections.filter { it.score >= MIN_DETECTION_SCORE && pack.cocoLabels.containsKey(it.label) })
        val dets = if (mode == VisionMode.PERSON) ranked.sortedByDescending { it.label == "person" } else ranked
        val translated = labels
            .filter { it.confidence >= MIN_LABEL_CONFIDENCE }
            .sortedByDescending { it.confidence }
            .mapNotNull { hit -> pack.labels[hit.text]?.let { hit to it } }
            .distinctBy { it.second.name }

        // Objeto apontado (classificador de 1000 tipos): o nome mais específico possível.
        val topClass = classes.filter { it.score >= MIN_CLASS_SCORE }.maxByOrNull { it.score }
            ?.let { hit -> pack.imagenet(hit.index)?.let { hit to it } }

        if (dets.isEmpty() && translated.isEmpty() && topClass == null) return VisionResult.NotRecognized

        fun where(d: Detection) = pack.position(position(d.box))

        val hazards = buildList {
            dets.filter { it.score >= MIN_HAZARD_SCORE }.forEach { d ->
                val term = pack.cocoLabels.getValue(d.label)
                if (term.hazard != null) add(term.hazard)
                if (d.label in vehicles && proximity(d.box) != Proximity.FAR) add(pack.vehicleNear(where(d)))
            }
            // Rótulos gerais (sem posição) quase nunca bastam para alertar: só com certeza muito alta.
            translated.forEach { (hit, term) -> if (term.hazard != null && hit.confidence >= 0.92f) add(term.hazard) }
            topClass?.let { (hit, term) -> if (term.hazard != null && hit.score >= 0.6f) add(term.hazard) }
        }.distinct()

        val identified: String
        val confidence: Confidence
        val classFirst = topClass != null && mode != VisionMode.PERSON &&
            (dets.isEmpty() || topClass.first.score >= 0.5f || dets.first().label !in vehicles + "person")
        if (classFirst) {
            val (hit, term) = topClass!!
            confidence = when {
                hit.score >= 0.7f -> Confidence.HIGH
                hit.score >= 0.5f -> Confidence.MEDIUM
                else -> Confidence.LOW
            }
            identified = if (confidence == Confidence.HIGH) pack.sure(term) else pack.likely(term)
        } else if (dets.isNotEmpty()) {
            val main = dets.first()
            identified = pack.detectedAt(pack.cocoLabels.getValue(main.label), where(main), proximity(main.box))
            confidence = when {
                main.score >= 0.75f -> Confidence.HIGH
                main.score >= 0.62f -> Confidence.MEDIUM
                else -> Confidence.LOW
            }
        } else {
            val (hit, term) = translated.first()
            confidence = when {
                hit.confidence >= 0.92f -> Confidence.HIGH
                hit.confidence >= 0.82f -> Confidence.MEDIUM
                else -> Confidence.LOW
            }
            identified = if (confidence == Confidence.HIGH) pack.sure(term) else pack.likely(term)
        }

        val description = buildList {
            val others = (if (classFirst) dets else dets.drop(1)).take(4).map { d ->
                val t = pack.cocoLabels.getValue(d.label)
                "${t.withArticle} ${where(d)}"
            }
            if (others.isNotEmpty()) add(pack.alsoAround(others))
            val detected = dets.map { pack.cocoLabels.getValue(it.label).name }.toSet() + setOfNotNull(topClass?.second?.name)
            val context = translated.map { it.second.name }.filter { it !in detected }
                .let { if (dets.isEmpty() && topClass == null) it.drop(1) else it }.take(3)
            if (context.isNotEmpty()) add(pack.alsoSeen(context))
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
