package com.leuname.lerguie.data.db

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Index
import androidx.room.Insert
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import kotlinx.coroutines.flow.Flow

enum class HistoryCategory { DESCRIPTION, READING, SPEECH, CONVERSATION, BARCODE }

@Entity(tableName = "history", indices = [Index("createdAt"), Index("category"), Index("favorite")])
data class HistoryEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val category: String,
    val title: String,
    val content: String,
    val createdAt: Long,
    val favorite: Boolean = false,
    val imagePath: String? = null,
)

@Dao
interface HistoryDao {
    @Query(
        """SELECT * FROM history
           WHERE (:category IS NULL OR category = :category)
             AND (:favoritesOnly = 0 OR favorite = 1)
             AND (:query = '' OR content LIKE '%' || :query || '%' OR title LIKE '%' || :query || '%')
           ORDER BY createdAt DESC LIMIT 500"""
    )
    fun observe(category: String?, favoritesOnly: Boolean, query: String): Flow<List<HistoryEntity>>

    @Query("SELECT * FROM history WHERE id = :id")
    suspend fun get(id: Long): HistoryEntity?

    @Insert
    suspend fun insert(item: HistoryEntity): Long

    @Query("UPDATE history SET favorite = :favorite WHERE id = :id")
    suspend fun setFavorite(id: Long, favorite: Boolean)

    @Query("SELECT imagePath FROM history WHERE id IN (:ids) AND imagePath IS NOT NULL")
    suspend fun imagePaths(ids: List<Long>): List<String>

    @Query("SELECT imagePath FROM history WHERE imagePath IS NOT NULL")
    suspend fun allImagePaths(): List<String>

    @Query("DELETE FROM history WHERE id IN (:ids)")
    suspend fun delete(ids: List<Long>)

    @Query("DELETE FROM history")
    suspend fun deleteAll()
}

@Database(entities = [HistoryEntity::class], version = 1, exportSchema = true)
abstract class LerguieDatabase : RoomDatabase() {
    abstract fun historyDao(): HistoryDao

    companion object {
        fun create(context: Context): LerguieDatabase =
            Room.databaseBuilder(context, LerguieDatabase::class.java, "lerguie.db").build()
    }
}
