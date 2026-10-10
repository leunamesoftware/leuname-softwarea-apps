package com.leunamesoftwares.pedee.entregador

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.os.Looper
import android.webkit.CookieManager
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

/**
 * Manda a posição do entregador para o servidor enquanto há entrega a caminho, mesmo com a tela apagada.
 * Usa só o GPS do Android (LocationManager), sem serviços do Google. Aparece um aviso fixo na barra enquanto liga.
 * Desliga sozinho quando o servidor diz que não há mais entrega a caminho, ou depois de 3 horas.
 */
class Rastreio : Service(), LocationListener {
    private var lm: LocationManager? = null
    private var ultimoEnvio = 0L
    private var semRota = 0
    private val inicio = System.currentTimeMillis()

    companion object {
        private const val CANAL = "rastreio"
        private const val AVISO = 7
        private const val PARAR = "parar"

        fun ligar(c: Context) {
            val i = Intent(c, Rastreio::class.java)
            if (Build.VERSION.SDK_INT >= 26) c.startForegroundService(i) else c.startService(i)
        }

        fun desligar(c: Context) { c.stopService(Intent(c, Rastreio::class.java)) }
    }

    override fun onBind(i: Intent?): IBinder? = null

    @SuppressLint("MissingPermission")
    override fun onStartCommand(i: Intent?, flags: Int, id: Int): Int {
        if (i?.action == PARAR) { stopSelf(); return START_NOT_STICKY }
        val aviso = aviso()
        if (Build.VERSION.SDK_INT >= 29) startForeground(AVISO, aviso, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION) else startForeground(AVISO, aviso)
        if (lm == null) {
            val m = getSystemService(Context.LOCATION_SERVICE) as LocationManager
            lm = m
            try {
                for (p in listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER)) {
                    if (m.isProviderEnabled(p)) m.requestLocationUpdates(p, 4000L, 8f, this, Looper.getMainLooper())
                }
            } catch (_: SecurityException) { stopSelf() }
        }
        return START_STICKY
    }

    private fun aviso(): Notification {
        val nm = getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CANAL) == null) {
            nm.createNotificationChannel(NotificationChannel(CANAL, "Entrega em andamento", NotificationManager.IMPORTANCE_LOW))
        }
        val abrir = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
        val b = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(this, CANAL) else @Suppress("DEPRECATION") Notification.Builder(this)
        return b.setContentTitle("Entrega em andamento")
            .setContentText("O cliente está vendo você no mapa.")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentIntent(abrir)
            .setOngoing(true)
            .build()
    }

    override fun onLocationChanged(l: Location) {
        val agora = System.currentTimeMillis()
        if (agora - inicio > 3 * 3600_000L) { stopSelf(); return }
        if (agora - ultimoEnvio < 7000L) return
        ultimoEnvio = agora
        val lat = l.latitude; val lng = l.longitude
        thread {
            try {
                val c = URL("${MainActivity.SITE}/api/entregador/posicao").openConnection() as HttpURLConnection
                c.requestMethod = "POST"
                c.connectTimeout = 10000; c.readTimeout = 10000
                c.doOutput = true
                c.setRequestProperty("Content-Type", "application/json")
                CookieManager.getInstance().getCookie(MainActivity.SITE)?.let { c.setRequestProperty("Cookie", it) }
                c.outputStream.use { it.write(JSONObject().put("lat", lat).put("lng", lng).toString().toByteArray()) }
                val codigo = c.responseCode
                if (codigo == 401) { stopSelf(); return@thread }
                if (codigo == 200) {
                    val r = JSONObject(c.inputStream.bufferedReader().readText())
                    // Três respostas seguidas sem entrega a caminho: desliga o GPS.
                    semRota = if (r.optBoolean("em_rota", true)) 0 else semRota + 1
                    if (semRota >= 3) stopSelf()
                }
                c.disconnect()
            } catch (_: Exception) { /* sem internet agora: tenta na próxima posição */ }
        }
    }

    @Deprecated("Android antigo")
    override fun onStatusChanged(p: String?, s: Int, e: Bundle?) {}
    override fun onProviderEnabled(p: String) {}
    override fun onProviderDisabled(p: String) {}

    override fun onDestroy() {
        lm?.removeUpdates(this)
        lm = null
        super.onDestroy()
    }
}
