package com.leunamesoftwares.pedee.entregador

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.webkit.CookieManager
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient

/**
 * Pedêê Entregador: abre o app do entregador (leuburger.leunamesoftware.com.br/entregador/) e cuida do que
 * o navegador atrapalha: a localização é a do próprio Android (pede uma vez) e continua com a tela apagada.
 * A página fala com o app pelo objeto "PedeeNativo".
 */
class MainActivity : Activity() {
    lateinit var web: WebView
    private var geoPendente: Pair<String, GeolocationPermissions.Callback>? = null
    private var cameraPendente: PermissionRequest? = null
    private var rastrearDepois = false

    companion object {
        const val SITE = "https://leuburger.leunamesoftware.com.br"
        const val INICIO = "$SITE/entregador/"
        private const val PEDIDO_LOCAL = 1
        private const val PEDIDO_CAMERA = 2
    }

    fun temLocal() = checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
        checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

    fun pedirLocal() {
        val p = mutableListOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)
        if (Build.VERSION.SDK_INT >= 33) p.add(Manifest.permission.POST_NOTIFICATIONS)
        requestPermissions(p.toTypedArray(), PEDIDO_LOCAL)
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(estado: Bundle?) {
        super.onCreate(estado)
        web = WebView(this)
        setContentView(web)
        CookieManager.getInstance().setAcceptCookie(true)
        with(web.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            setGeolocationEnabled(true)
            mediaPlaybackRequiresUserGesture = false
            userAgentString = "$userAgentString PedeeEntregadorAndroid/${BuildConfig.VERSION_NAME}"
        }
        web.addJavascriptInterface(Ponte(this), "PedeeNativo")
        web.webChromeClient = object : WebChromeClient() {
            // Localização para o mapa da própria página: usa a permissão do app (não a do Chrome).
            override fun onGeolocationPermissionsShowPrompt(origem: String, cb: GeolocationPermissions.Callback) {
                if (temLocal()) cb.invoke(origem, true, true) else { geoPendente = origem to cb; pedirLocal() }
            }
            // Câmera da selfie.
            override fun onPermissionRequest(pedido: PermissionRequest) {
                runOnUiThread {
                    if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) pedido.grant(pedido.resources)
                    else { cameraPendente = pedido; requestPermissions(arrayOf(Manifest.permission.CAMERA), PEDIDO_CAMERA) }
                }
            }
        }
        web.webViewClient = object : WebViewClient() {
            // O app do entregador abre aqui dentro; Waze, Google Maps, telefone de emergência etc. abrem no app certo.
            override fun shouldOverrideUrlLoading(view: WebView, pedido: WebResourceRequest): Boolean {
                val uri = pedido.url
                if (uri.scheme == "https" && (uri.host ?: "").endsWith("leunamesoftware.com.br")) return false
                try { startActivity(Intent(Intent.ACTION_VIEW, uri)) } catch (_: Exception) {}
                return true
            }
        }
        if (estado != null) web.restoreState(estado) else web.loadUrl(INICIO)
        if (!temLocal()) pedirLocal()
    }

    override fun onRequestPermissionsResult(codigo: Int, permissoes: Array<out String>, resultado: IntArray) {
        if (codigo == PEDIDO_LOCAL) {
            val ok = temLocal()
            geoPendente?.let { (origem, cb) -> cb.invoke(origem, ok, ok) }
            geoPendente = null
            if (ok && rastrearDepois) Rastreio.ligar(this)
            rastrearDepois = false
            js("window.pedeeNativo && pedeeNativo.permissao && pedeeNativo.permissao($ok)")
        } else if (codigo == PEDIDO_CAMERA) {
            val p = cameraPendente; cameraPendente = null
            if (p != null) {
                if (resultado.isNotEmpty() && resultado[0] == PackageManager.PERMISSION_GRANTED) p.grant(p.resources) else p.deny()
            }
        }
    }

    fun rastrear(ligar: Boolean) = runOnUiThread {
        if (!ligar) { Rastreio.desligar(this); return@runOnUiThread }
        if (temLocal()) Rastreio.ligar(this) else { rastrearDepois = true; pedirLocal() }
    }

    fun abrirConfiguracoes() = runOnUiThread {
        startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName")))
    }

    override fun onSaveInstanceState(saida: Bundle) {
        super.onSaveInstanceState(saida)
        web.saveState(saida)
    }

    override fun onPause() {
        super.onPause()
        CookieManager.getInstance().flush()
    }

    @Deprecated("Botão voltar do Android")
    override fun onBackPressed() {
        if (web.canGoBack()) web.goBack() else @Suppress("DEPRECATION") super.onBackPressed()
    }

    fun js(codigo: String) = runOnUiThread { web.evaluateJavascript(codigo, null) }
}

/** O que a página do entregador pode pedir ao app (window.PedeeNativo). */
class Ponte(private val a: MainActivity) {
    @JavascriptInterface fun versao(): String = BuildConfig.VERSION_NAME
    @JavascriptInterface fun temLocalizacao(): Boolean = a.temLocal()
    /** Liga quando há entrega a caminho; desliga quando não há (e o app também desliga sozinho). */
    @JavascriptInterface fun rastrear(ligar: Boolean) = a.rastrear(ligar)
    @JavascriptInterface fun pedirLocalizacao() = a.runOnUiThread { a.pedirLocal() }
    @JavascriptInterface fun abrirConfiguracoes() = a.abrirConfiguracoes()
}
