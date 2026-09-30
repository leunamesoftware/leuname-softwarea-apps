package com.leuname.lerguie.ai.barcode

import android.graphics.Bitmap
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.net.HttpURLConnection
import java.net.URL
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.intOrNull

data class BarcodeInfo(val value: String, val isProduct: Boolean, val isUrl: Boolean)

/** Leitura de código de barras / QR no aparelho (offline). */
class BarcodeReader {
    private val scanner = BarcodeScanning.getClient()

    suspend fun read(bitmap: Bitmap): BarcodeInfo? = withContext(Dispatchers.Default) {
        try {
            val codes = scanner.process(InputImage.fromBitmap(bitmap, 0)).await()
            codes.firstOrNull { !it.rawValue.isNullOrBlank() }?.let { code ->
                val product = code.format in setOf(
                    Barcode.FORMAT_EAN_13, Barcode.FORMAT_EAN_8, Barcode.FORMAT_UPC_A, Barcode.FORMAT_UPC_E
                )
                BarcodeInfo(code.rawValue!!, product, code.valueType == Barcode.TYPE_URL)
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            null
        }
    }
}

/**
 * Consulta opcional do nome do produto na base aberta Open Food Facts (sem chave).
 * Só o número do código é enviado.
 */
class ProductLookup {
    private val json = Json { ignoreUnknownKeys = true }

    suspend fun lookup(ean: String): String? = withContext(Dispatchers.IO) {
        if (!ean.all { it.isDigit() }) return@withContext null
        runCatching {
            val url = URL("https://world.openfoodfacts.org/api/v2/product/$ean.json?fields=product_name,brands,quantity")
            val conn = url.openConnection() as HttpURLConnection
            conn.connectTimeout = 8000
            conn.readTimeout = 8000
            conn.setRequestProperty("User-Agent", "Lerguie/1.0 (Android; acessibilidade)")
            val body = conn.inputStream.bufferedReader().use { it.readText() }
            conn.disconnect()
            val root = json.parseToJsonElement(body).jsonObject
            if (root["status"]?.jsonPrimitive?.intOrNull != 1) return@runCatching null
            val p = root["product"]?.jsonObject ?: return@runCatching null
            listOf("product_name", "brands", "quantity")
                .mapNotNull { p[it]?.jsonPrimitive?.content?.takeIf { v -> v.isNotBlank() } }
                .joinToString(" — ")
                .ifBlank { null }
        }.getOrNull()
    }
}
