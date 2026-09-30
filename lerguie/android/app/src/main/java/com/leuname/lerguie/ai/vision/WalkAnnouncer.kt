package com.leuname.lerguie.ai.vision

import com.leuname.lerguie.i18n.LanguagePack
import com.leuname.lerguie.i18n.Proximity

data class Announcement(val text: String, val alert: Boolean)

/**
 * Modo Caminhar: decide O QUE falar a cada quadro, sem repetir à toa.
 * Fala um objeto quando aparece, quando muda de lado ou quando se aproxima.
 * Veículo perto à frente vira alerta. No máximo 2 avisos por ciclo.
 */
class WalkAnnouncer(private val repeatAfterMs: Long = 7000) {
    private data class Memory(val proximity: Proximity, val at: Long)
    private val memory = mutableMapOf<String, Memory>()

    fun reset() = memory.clear()

    fun next(detections: List<Detection>, pack: LanguagePack, now: Long): List<Announcement> {
        val relevant = OnDeviceComposer.rank(detections.filter { it.score >= 0.6f && pack.cocoLabels.containsKey(it.label) })
        val out = mutableListOf<Announcement>()
        for (d in relevant) {
            if (out.size >= 2) break
            val pos = OnDeviceComposer.position(d.box)
            val prox = OnDeviceComposer.proximity(d.box)
            val key = "${d.label}:${pos.name}"
            val last = memory[key]
            val closer = last != null && prox.ordinal < last.proximity.ordinal
            val stale = last == null || now - last.at > repeatAfterMs
            if (!closer && !stale) continue
            if (last == null && prox == Proximity.FAR && d.label !in OnDeviceComposer.vehicles && d.label != "person") continue
            memory[key] = Memory(prox, now)
            val term = pack.cocoLabels.getValue(d.label)
            val alert = (d.label in OnDeviceComposer.vehicles && prox != Proximity.FAR) || term.hazard != null
            val text = pack.walkItem(term, pack.position(pos), prox)
            out += Announcement(if (alert) pack.attention(listOf(text)) else text, alert)
        }
        // Esquece o que não é visto há muito tempo.
        memory.entries.removeAll { now - it.value.at > repeatAfterMs * 3 }
        return out
    }
}
