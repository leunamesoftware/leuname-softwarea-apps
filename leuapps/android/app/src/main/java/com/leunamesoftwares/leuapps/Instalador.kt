package com.leunamesoftwares.leuapps

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.os.Build
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.ConcurrentHashMap
import kotlin.concurrent.thread

/**
 * Baixa o APK e entrega ao instalador do Android (PackageInstaller), mostrando o progresso na loja.
 * O Android mostra a confirmação "Instalar este app?"; depois o ícone aparece na tela do celular.
 */
object Instalador {
    private fun texto(s: String) = JSONObject.quote(s)
    /** Downloads que a pessoa mandou cancelar (botão Cancelar na loja). */
    private val cancelados = ConcurrentHashMap.newKeySet<String>()
    fun cancelar(id: String) { cancelados.add(id) }

    fun instalar(a: MainActivity, id: String, endereco: String) = thread(name = "instalar-$id") {
        val idJs = texto(id)
        cancelados.remove(id)
        try {
            var con = URL(endereco).openConnection() as HttpURLConnection
            con.instanceFollowRedirects = true
            con.connectTimeout = 20000
            con.readTimeout = 60000
            con.connect()
            if (con.responseCode !in 200..299) throw Exception("Não consegui baixar o app (erro ${con.responseCode}).")
            val total = con.contentLengthLong
            val instalador = a.packageManager.packageInstaller
            val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL)
            // Android 12+: atualizações de apps que a LeuApps instalou podem ir sem perguntar de novo.
            if (Build.VERSION.SDK_INT >= 31) params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED)
            if (total > 0) params.setSize(total)
            val sessaoId = instalador.createSession(params)
            instalador.openSession(sessaoId).use { sessao ->
                con.inputStream.use { entrada ->
                    sessao.openWrite("app.apk", 0, if (total > 0) total else -1).use { saida ->
                        val buf = ByteArray(64 * 1024)
                        var lidos = 0L
                        var ultimo = -1
                        while (true) {
                            val n = entrada.read(buf)
                            if (n < 0) break
                            if (cancelados.remove(id)) {
                                sessao.abandon()
                                con.disconnect()
                                a.js("leuNativo.fim($idJs, false, 'cancelado')")
                                return@thread
                            }
                            saida.write(buf, 0, n)
                            lidos += n
                            val pct = if (total > 0) (lidos * 100 / total).toInt() else -1
                            if (pct != ultimo && (pct - ultimo >= 2 || pct == 100)) {
                                ultimo = pct
                                a.js("leuNativo.progresso($idJs, $pct)")
                            }
                        }
                        sessao.fsync(saida)
                    }
                }
                a.js("leuNativo.progresso($idJs, 100)")
                val aviso = Intent(a, InstalacaoReceiver::class.java).putExtra("id", id)
                val flags = PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0)
                val pendente = PendingIntent.getBroadcast(a, sessaoId, aviso, flags)
                sessao.commit(pendente.intentSender)
            }
            con.disconnect()
        } catch (e: Exception) {
            a.js("leuNativo.fim($idJs, false, ${texto(e.message ?: "Não deu para instalar agora.")})")
        }
    }
}

/** Resposta do instalador do Android: pede a confirmação da pessoa, ou avisa que terminou. */
class InstalacaoReceiver : android.content.BroadcastReceiver() {
    override fun onReceive(c: Context, i: Intent) {
        val id = JSONObject.quote(i.getStringExtra("id") ?: "")
        when (i.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)) {
            PackageInstaller.STATUS_PENDING_USER_ACTION -> {
                val confirmar: Intent? = if (Build.VERSION.SDK_INT >= 33) i.getParcelableExtra(Intent.EXTRA_INTENT, Intent::class.java)
                    else @Suppress("DEPRECATION") i.getParcelableExtra(Intent.EXTRA_INTENT)
                if (confirmar != null) {
                    confirmar.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    c.startActivity(confirmar)
                }
            }
            PackageInstaller.STATUS_SUCCESS -> MainActivity.atual?.js("leuNativo.fim($id, true, '')")
            else -> {
                val msg = i.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE) ?: "Instalação cancelada."
                MainActivity.atual?.js("leuNativo.fim($id, false, ${JSONObject.quote(msg)})")
            }
        }
    }
}
