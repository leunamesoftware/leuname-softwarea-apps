package com.leuname.lerguie.ai.memory

import android.graphics.Bitmap
import com.leuname.lerguie.data.db.KnownObjectDao
import com.leuname.lerguie.data.db.KnownObjectEntity
import com.leuname.lerguie.data.db.KnownObjectWithCount
import com.leuname.lerguie.data.db.KnownSampleEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext

/**
 * "Objetos ensinados": alguém que enxerga fotografa um objeto e dá um nome; depois,
 * quando a câmera vê algo parecido, o Lerguie diz o nome. Tudo fica no aparelho
 * (só vetores de semelhança, sem as fotos) e funciona sem internet.
 */
class ObjectMemory(private val dao: KnownObjectDao, private val embedder: ImageEmbedderEngine) {
    private val mutex = Mutex()
    private var cache: List<KnownSample>? = null

    fun observe(): Flow<List<KnownObjectWithCount>> = dao.observe()

    /** Ensina um objeto com 1 a 5 fotos (ângulos diferentes melhoram o reconhecimento). */
    suspend fun teach(name: String, photos: List<Bitmap>): Boolean = withContext(Dispatchers.Default) {
        val vectors = photos.take(5).mapNotNull { embedder.embed(it) }
        if (vectors.isEmpty() || name.isBlank()) return@withContext false
        val id = dao.insertObject(KnownObjectEntity(name = name.trim().take(80), createdAt = System.currentTimeMillis()))
        dao.insertSamples(vectors.map { KnownSampleEntity(objectId = id, embedding = MemoryMatcher.toBytes(it)) })
        mutex.withLock { cache = null }
        true
    }

    suspend fun delete(id: Long) {
        dao.deleteSamples(id)
        dao.deleteObject(id)
        mutex.withLock { cache = null }
    }

    /** Procura um objeto ensinado parecido com a imagem. Null se não houver com segurança. */
    suspend fun recognize(bitmap: Bitmap): KnownMatch? = withContext(Dispatchers.Default) {
        val samples = mutex.withLock {
            cache ?: dao.allSamples().map { KnownSample(it.objectId, it.name, MemoryMatcher.fromBytes(it.embedding)) }
                .also { cache = it }
        }
        if (samples.isEmpty()) return@withContext null
        val query = embedder.embed(bitmap) ?: return@withContext null
        MemoryMatcher.best(query, samples)
    }
}
