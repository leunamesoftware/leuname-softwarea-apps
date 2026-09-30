package com.leuname.lerguie.core.network

import android.content.Context
import android.util.Base64
import com.leuname.lerguie.BuildConfig
import com.leuname.lerguie.core.plans.PlanCatalog
import com.leuname.lerguie.i18n.LanguagePacks
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

open class ApiException(val code: Int, val error: String?) : IOException("HTTP $code ${error.orEmpty()}")

/** Limite do plano atingido: o app continua funcionando com a análise no aparelho. */
class QuotaExceededException : ApiException(429, "quota_exceeded")

@Serializable
private data class SessionRequest(val installId: String, val appVersion: String)

@Serializable
private data class SessionResponse(val token: String, val expiresAt: Long, val plan: String = "free")

@Serializable
private data class VerifyRequest(val productId: String, val purchaseToken: String)

@Serializable
private data class ErrorBody(val error: String? = null)

@Serializable
data class DescribeRequest(val image: String, val mode: String, val locale: String)

@Serializable
data class DescribeResponse(
    val identified: String = "",
    val description: String = "",
    val environment: String = "",
    val action: String = "",
    val colors: String = "",
    val hazards: List<String> = emptyList(),
    val confidence: String = "low",
)

/**
 * Cliente do backend do Lerguie. O app NUNCA guarda chaves de IA nem de loja: ele obtém
 * um token de sessão curto do backend, que também informa o plano ativo (validado no servidor).
 */
class LerguieApiClient(context: Context, private val baseUrl: String) {
    private val prefs = context.getSharedPreferences("api_session", Context.MODE_PRIVATE)
    private val json = Json { ignoreUnknownKeys = true; explicitNulls = false; encodeDefaults = true }
    private val tokenMutex = Mutex()

    val isConfigured: Boolean = baseUrl.startsWith("https://")

    private val _planId = MutableStateFlow(prefs.getString("plan", null) ?: "free")
    val planId: StateFlow<String> = _planId.asStateFlow()

    private val installId: String
        get() = prefs.getString("install_id", null) ?: UUID.randomUUID().toString().also {
            prefs.edit().putString("install_id", it).apply()
        }

    suspend fun describe(jpeg: ByteArray, mode: String): DescribeResponse {
        val body = json.encodeToString(
            DescribeRequest(Base64.encodeToString(jpeg, Base64.NO_WRAP), mode, LanguagePacks.current().languageTag)
        )
        return json.decodeFromString(DescribeResponse.serializer(), authorizedPost("/v1/describe", body))
    }

    /** Catálogo de planos (preços NÃO vêm daqui: vêm da Play Store). */
    suspend fun plans(): PlanCatalog = json.decodeFromString(PlanCatalog.serializer(), request("GET", "/v1/plans", null, null))

    /** Envia a compra ao backend, que valida com o Google Play e devolve um token com o plano. */
    suspend fun verifyPurchase(productId: String, purchaseToken: String) {
        val text = authorizedPost("/v1/billing/verify", json.encodeToString(VerifyRequest(productId, purchaseToken)))
        storeSession(json.decodeFromString(SessionResponse.serializer(), text))
    }

    private suspend fun authorizedPost(path: String, body: String): String {
        val token = token(forceRefresh = false)
        return try {
            request("POST", path, body, token)
        } catch (e: ApiException) {
            if (e.code != 401) throw e
            request("POST", path, body, token(forceRefresh = true))
        }
    }

    private suspend fun token(forceRefresh: Boolean): String = tokenMutex.withLock {
        val cached = prefs.getString("token", null)
        val exp = prefs.getLong("token_exp", 0)
        if (!forceRefresh && cached != null && exp - 60 > System.currentTimeMillis() / 1000) return cached
        val req = json.encodeToString(SessionRequest(installId, BuildConfig.VERSION_NAME))
        val res = json.decodeFromString(SessionResponse.serializer(), request("POST", "/v1/session", req, null))
        storeSession(res)
        res.token
    }

    private fun storeSession(res: SessionResponse) {
        prefs.edit().putString("token", res.token).putLong("token_exp", res.expiresAt).putString("plan", res.plan).apply()
        _planId.value = res.plan
    }

    private suspend fun request(method: String, path: String, body: String?, token: String?): String = withContext(Dispatchers.IO) {
        check(isConfigured) { "Backend não configurado" }
        val conn = URL(baseUrl + path).openConnection() as HttpURLConnection
        try {
            conn.requestMethod = method
            conn.connectTimeout = 10_000
            conn.readTimeout = 45_000
            conn.setRequestProperty("Accept", "application/json")
            if (token != null) conn.setRequestProperty("Authorization", "Bearer $token")
            if (body != null) {
                conn.doOutput = true
                conn.setRequestProperty("Content-Type", "application/json")
                conn.outputStream.use { it.write(body.toByteArray()) }
            }
            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val text = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
            if (code !in 200..299) {
                val error = runCatching { json.decodeFromString(ErrorBody.serializer(), text).error }.getOrNull()
                if (code == 429 && error == "quota_exceeded") throw QuotaExceededException()
                throw ApiException(code, error)
            }
            text
        } finally {
            conn.disconnect()
        }
    }
}
