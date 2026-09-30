package com.leuname.lerguie.data.history

import android.content.Context
import android.graphics.Bitmap
import com.leuname.lerguie.core.settings.SettingsRepository
import com.leuname.lerguie.core.util.Bitmaps
import com.leuname.lerguie.data.db.HistoryCategory
import com.leuname.lerguie.data.db.HistoryDao
import com.leuname.lerguie.data.db.HistoryEntity
import java.io.File
import java.util.UUID
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext

/**
 * Histórico 100% local (armazenamento privado do app, excluído de backups).
 * Registro automático só acontece se o usuário ativar "Salvar histórico".
 * "Salvar" manual sempre grava (é uma ação explícita do usuário) e marca como favorito.
 */
class HistoryRepository(
    context: Context,
    private val dao: HistoryDao,
    private val settings: SettingsRepository,
) {
    private val imagesDir = File(context.filesDir, "history").apply { mkdirs() }

    fun observe(category: HistoryCategory?, favoritesOnly: Boolean, query: String): Flow<List<HistoryEntity>> =
        dao.observe(category?.name, favoritesOnly, query.trim())

    /** Registro automático: retorna o id ou null se o usuário não autorizou histórico. */
    suspend fun recordIfAllowed(category: HistoryCategory, title: String, content: String, image: Bitmap? = null): Long? {
        if (!settings.current().saveHistory) return null
        return insert(category, title, content, image, favorite = false)
    }

    /** Salvar explícito do usuário. Se já existe registro automático, apenas marca como favorito. */
    suspend fun saveFavorite(existingId: Long?, category: HistoryCategory, title: String, content: String, image: Bitmap? = null): Long {
        if (existingId != null && dao.get(existingId) != null) {
            dao.setFavorite(existingId, true)
            return existingId
        }
        return insert(category, title, content, image, favorite = true)
    }

    suspend fun get(id: Long) = dao.get(id)

    suspend fun setFavorite(id: Long, favorite: Boolean) = dao.setFavorite(id, favorite)

    suspend fun delete(ids: List<Long>) = withContext(Dispatchers.IO) {
        if (ids.isEmpty()) return@withContext
        dao.imagePaths(ids).forEach { File(it).delete() }
        dao.delete(ids)
    }

    suspend fun deleteAll() = withContext(Dispatchers.IO) {
        dao.deleteAll()
        imagesDir.listFiles()?.forEach { it.delete() }
    }

    private suspend fun insert(category: HistoryCategory, title: String, content: String, image: Bitmap?, favorite: Boolean): Long =
        withContext(Dispatchers.IO) {
            val path = image?.let { saveThumbnail(it) }
            dao.insert(
                HistoryEntity(
                    category = category.name,
                    title = title.take(200),
                    content = content.take(50_000),
                    createdAt = System.currentTimeMillis(),
                    favorite = favorite,
                    imagePath = path,
                )
            )
        }

    private fun saveThumbnail(bitmap: Bitmap): String? = runCatching {
        val file = File(imagesDir, UUID.randomUUID().toString() + ".jpg")
        file.writeBytes(Bitmaps.toJpeg(Bitmaps.scaleDown(bitmap, 480), 75))
        file.absolutePath
    }.getOrNull()
}
