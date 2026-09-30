package com.leuname.lerguie.ai.memory

import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.sqrt

data class KnownSample(val objectId: Long, val name: String, val vector: FloatArray)

enum class MatchLevel { SURE, LIKELY }

data class KnownMatch(val objectId: Long, val name: String, val similarity: Float, val level: MatchLevel)

/** Busca por semelhança (cosseno) entre a imagem atual e os objetos ensinados. Sem Android: testável. */
object MemoryMatcher {
    const val SURE = 0.86f
    const val LIKELY = 0.78f
    /** Diferença mínima para o segundo colocado; abaixo disso é ambíguo e não afirmamos. */
    const val MARGIN = 0.03f

    fun cosine(a: FloatArray, b: FloatArray): Float {
        if (a.size != b.size || a.isEmpty()) return 0f
        var dot = 0f; var na = 0f; var nb = 0f
        for (i in a.indices) {
            dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]
        }
        return if (na == 0f || nb == 0f) 0f else dot / (sqrt(na) * sqrt(nb))
    }

    fun best(query: FloatArray, samples: List<KnownSample>): KnownMatch? {
        if (samples.isEmpty()) return null
        val perObject = samples.groupBy { it.objectId }.map { (id, list) ->
            Triple(id, list.first().name, list.maxOf { cosine(query, it.vector) })
        }.sortedByDescending { it.third }
        val (id, name, sim) = perObject.first()
        val second = perObject.getOrNull(1)?.third ?: 0f
        if (sim < LIKELY) return null
        val level = if (sim >= SURE && sim - second >= MARGIN) MatchLevel.SURE else MatchLevel.LIKELY
        return KnownMatch(id, name, sim, level)
    }

    fun toBytes(v: FloatArray): ByteArray =
        ByteBuffer.allocate(v.size * 4).order(ByteOrder.LITTLE_ENDIAN).apply { v.forEach { putFloat(it) } }.array()

    fun fromBytes(b: ByteArray): FloatArray {
        val buf = ByteBuffer.wrap(b).order(ByteOrder.LITTLE_ENDIAN)
        return FloatArray(b.size / 4) { buf.getFloat() }
    }
}
