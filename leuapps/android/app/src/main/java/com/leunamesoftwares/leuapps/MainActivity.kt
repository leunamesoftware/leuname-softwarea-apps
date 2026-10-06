package com.leunamesoftwares.leuapps

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import org.json.JSONArray
import org.json.JSONObject

/**
 * LeuApps: mostra a loja (www.leunamesoftware.com.br) e faz o que só um app consegue:
 * instalar, abrir e desinstalar os apps no celular. A página fala com o app pelo objeto "LeuNativo".
 */
class MainActivity : Activity() {
    lateinit var web: WebView

    companion object {
        const val LOJA = "https://www.leunamesoftware.com.br/?loja=android"
        var atual: MainActivity? = null
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(estado: Bundle?) {
        super.onCreate(estado)
        atual = this
        web = WebView(this)
        setContentView(web)
        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true
        web.settings.userAgentString = web.settings.userAgentString + " LeuAppsAndroid/" + BuildConfig.VERSION_NAME
        web.addJavascriptInterface(Ponte(this), "LeuNativo")
        web.webChromeClient = WebChromeClient()
        web.webViewClient = object : WebViewClient() {
            // Páginas da LeuName abrem aqui dentro; o resto (WhatsApp, Mercado Pago...) abre no app certo.
            override fun shouldOverrideUrlLoading(view: WebView, pedido: WebResourceRequest): Boolean {
                val uri = pedido.url
                val nosso = uri.scheme == "https" && (uri.host ?: "").endsWith("leunamesoftware.com.br")
                if (nosso) return false
                try { startActivity(Intent(Intent.ACTION_VIEW, uri)) } catch (_: Exception) {}
                return true
            }
        }
        if (estado != null) web.restoreState(estado) else web.loadUrl(LOJA)
    }

    override fun onSaveInstanceState(saida: Bundle) {
        super.onSaveInstanceState(saida)
        web.saveState(saida)
    }

    // Voltou para a loja (depois de instalar, abrir ou desinstalar um app): a página confere de novo.
    override fun onResume() {
        super.onResume()
        atual = this
        js("window.leuNativo && leuNativo.voltou && leuNativo.voltou()")
    }

    override fun onDestroy() {
        if (atual === this) atual = null
        super.onDestroy()
    }

    @Deprecated("Botão voltar do Android")
    override fun onBackPressed() {
        if (web.canGoBack()) web.goBack() else @Suppress("DEPRECATION") super.onBackPressed()
    }

    fun js(codigo: String) = runOnUiThread { web.evaluateJavascript(codigo, null) }
}

/** O que a página da loja pode pedir ao app (window.LeuNativo). */
class Ponte(private val a: MainActivity) {
    private val pm get() = a.packageManager

    @JavascriptInterface fun versao(): String = BuildConfig.VERSION_NAME

    /** Recebe ["pacote", ...] e devolve {"pacote": versionCode} só dos instalados. */
    @JavascriptInterface fun instalados(pacotes: String): String {
        val lista = JSONArray(pacotes)
        val saida = JSONObject()
        for (i in 0 until lista.length()) {
            val p = lista.getString(i)
            try {
                val info = pm.getPackageInfo(p, 0)
                val codigo = if (Build.VERSION.SDK_INT >= 28) info.longVersionCode else @Suppress("DEPRECATION") info.versionCode.toLong()
                saida.put(p, codigo)
            } catch (_: Exception) { /* não instalado */ }
        }
        return saida.toString()
    }

    /** Android 8+: a pessoa precisa permitir uma vez que a LeuApps instale apps. */
    @JavascriptInterface fun podeInstalar(): Boolean = Build.VERSION.SDK_INT < 26 || pm.canRequestPackageInstalls()

    @JavascriptInterface fun pedirPermissao() {
        if (Build.VERSION.SDK_INT < 26) return
        a.runOnUiThread {
            a.startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + a.packageName)))
        }
    }

    @JavascriptInterface fun instalar(id: String, url: String) = Instalador.instalar(a, id, url)

    /** Cancela o download em andamento (a instalação não acontece). */
    @JavascriptInterface fun cancelar(id: String) = Instalador.cancelar(id)

    @JavascriptInterface fun abrir(pacote: String): Boolean {
        val abrir = pm.getLaunchIntentForPackage(pacote) ?: return false
        a.runOnUiThread { a.startActivity(abrir) }
        return true
    }

    @JavascriptInterface fun desinstalar(pacote: String) {
        a.runOnUiThread {
            a.startActivity(Intent(Intent.ACTION_DELETE, Uri.parse("package:$pacote")))
        }
    }
}
