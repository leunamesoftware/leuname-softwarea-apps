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
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
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

/** Objeto ensinado por alguém (nome dado pela pessoa) — memória local do aparelho. */
@Entity(tableName = "known_objects")
data class KnownObjectEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val createdAt: Long,
)

/** Amostra visual (vetor de semelhança) de um objeto ensinado. A foto em si não é guardada. */
@Entity(tableName = "known_samples", indices = [Index("objectId")])
data class KnownSampleEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val objectId: Long,
    val embedding: ByteArray,
)

data class KnownObjectWithCount(val id: Long, val name: String, val createdAt: Long, val samples: Int)

data class KnownSampleRow(val objectId: Long, val name: String, val embedding: ByteArray)

@Dao
interface KnownObjectDao {
    @Query(
        """SELECT o.id, o.name, o.createdAt, COUNT(s.id) AS samples FROM known_objects o
           LEFT JOIN known_samples s ON s.objectId = o.id GROUP BY o.id ORDER BY o.name COLLATE NOCASE"""
    )
    fun observe(): Flow<List<KnownObjectWithCount>>

    @Query("SELECT s.objectId, o.name, s.embedding FROM known_samples s JOIN known_objects o ON o.id = s.objectId")
    suspend fun allSamples(): List<KnownSampleRow>

    @Insert
    suspend fun insertObject(o: KnownObjectEntity): Long

    @Insert
    suspend fun insertSamples(s: List<KnownSampleEntity>)

    @Query("DELETE FROM known_samples WHERE objectId = :id")
    suspend fun deleteSamples(id: Long)

    @Query("DELETE FROM known_objects WHERE id = :id")
    suspend fun deleteObject(id: Long)
}

@Database(
    entities = [HistoryEntity::class, KnownObjectEntity::class, KnownSampleEntity::class],
    version = 2,
    exportSchema = true,
)
abstract class LerguieDatabase : RoomDatabase() {
    abstract fun historyDao(): HistoryDao
    abstract fun knownObjectDao(): KnownObjectDao

    companion object {
        /** v1 → v2: tabelas de objetos ensinados (histórico existente é preservado). */
        private val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("CREATE TABLE IF NOT EXISTS `known_objects` (`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, `name` TEXT NOT NULL, `createdAt` INTEGER NOT NULL)")
                db.execSQL("CREATE TABLE IF NOT EXISTS `known_samples` (`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, `objectId` INTEGER NOT NULL, `embedding` BLOB NOT NULL)")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_known_samples_objectId` ON `known_samples` (`objectId`)")
            }
        }

        fun create(context: Context): LerguieDatabase =
            Room.databaseBuilder(context, LerguieDatabase::class.java, "lerguie.db")
                .addMigrations(MIGRATION_1_2)
                .build()
    }
}
