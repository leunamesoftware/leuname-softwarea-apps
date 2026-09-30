package com.leuname.lerguie.core.update

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import com.leuname.lerguie.BuildConfig
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

data class UpdateInfo(val version: Int, val apkUrl: String)

/**
 * Atualização da versão de TESTE: ao abrir, procura no GitHub uma versão mais nova
 * (releases "lerguie-v1.0.0-teste.N"), baixa e abre o instalador do Android.
 * Na versão da Play Store isto fica desligado (a loja atualiza).
 */
class AppUpdater(private val context: Context) {
    private val json = Json { ignoreUnknownKeys = true }

    val enabled: Boolean get() = BuildConfig.UPDATE_CHECK

    suspend fun check(): UpdateInfo? = withContext(Dispatchers.IO) {
        if (!enabled) return@withContext null
        runCatching {
            val conn = URL(RELEASES_URL).openConnection() as HttpURLConnection
            conn.connectTimeout = 8000
            conn.readTimeout = 8000
            conn.setRequestProperty("Accept", "application/vnd.github+json")
            val body = conn.inputStream.bufferedReader().use { it.readText() }
            conn.disconnect()
            json.parseToJsonElement(body).jsonArray.mapNotNull { r ->
                val o = r.jsonObject
                val tag = o["tag_name"]?.jsonPrimitive?.content ?: return@mapNotNull null
                val n = TAG.matchEntire(tag)?.groupValues?.get(1)?.toIntOrNull() ?: return@mapNotNull null
                val asset = o["assets"]?.jsonArray?.map { it.jsonObject }
                    ?.firstOrNull { it["name"]?.jsonPrimitive?.content == ASSET_NAME }
                    ?.get("browser_download_url")?.jsonPrimitive?.content ?: return@mapNotNull null
                UpdateInfo(n, asset)
            }.maxByOrNull { it.version }?.takeIf { it.version > BuildConfig.VERSION_CODE }
        }.getOrNull()
    }

    /** Baixa o APK (com progresso 0..1) e retorna o arquivo. */
    suspend fun download(info: UpdateInfo, onProgress: (Float) -> Unit): File? = withContext(Dispatchers.IO) {
        runCatching {
            val dir = File(context.cacheDir, "updates").apply { mkdirs() }
            dir.listFiles()?.forEach { it.delete() }
            val file = File(dir, "lerguie-${info.version}.apk")
            val conn = URL(info.apkUrl).openConnection() as HttpURLConnection
            conn.instanceFollowRedirects = true
            conn.connectTimeout = 15000
            conn.readTimeout = 30000
            val total = conn.contentLengthLong
            conn.inputStream.use { input ->
                file.outputStream().use { out ->
                    val buf = ByteArray(64 * 1024)
                    var done = 0L
                    while (true) {
                        val n = input.read(buf)
                        if (n < 0) break
                        out.write(buf, 0, n)
                        done += n
                        if (total > 0) onProgress(done.toFloat() / total)
                    }
                }
            }
            conn.disconnect()
            file
        }.getOrNull()
    }

    /** Android exige a confirmação do usuário para instalar; aqui só abrimos o instalador. */
    fun install(file: File) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !context.packageManager.canRequestPackageInstalls()) {
            context.startActivity(
                Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${context.packageName}"))
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            )
            return
        }
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.updates", file)
        context.startActivity(
            Intent(Intent.ACTION_VIEW)
                .setDataAndType(uri, "application/vnd.android.package-archive")
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
        )
    }

    companion object {
        private const val RELEASES_URL = "https://api.github.com/repos/leunamesoftware/leuname-softwarea-apps/releases?per_page=20"
        private val TAG = Regex("lerguie-v[0-9.]+-teste\\.(\\d+)")
        private const val ASSET_NAME = "Lerguie-teste.apk"
    }
}
