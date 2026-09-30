package com.leuname.lerguie

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.leuname.lerguie.core.settings.AppSettings
import com.leuname.lerguie.ui.navigation.LerguieNavHost
import com.leuname.lerguie.ui.theme.LerguieTheme
import com.leuname.lerguie.ui.theme.LocalAnnouncer

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        val splash = installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val container = (application as LerguieApp).container
        var loaded = false
        splash.setKeepOnScreenCondition { !loaded }
        setContent {
            // Espera as preferências reais (evita piscar a tela de boas-vindas para quem já escolheu).
            val settings by produceState<AppSettings?>(null) { container.settings.settings.collect { value = it } }
            val s = settings ?: return@setContent
            loaded = true
            LerguieTheme(s) {
                val announcer: (String) -> Unit = if (s.announceButtons) { t -> container.speaker.speak(t, "button") } else { _ -> }
                CompositionLocalProvider(LocalAnnouncer provides announcer) {
                    LerguieNavHost(startOnboarding = !s.onboarded)
                }
            }
        }
    }

    override fun onStop() {
        super.onStop()
        // Ao sair do app nada continua falando.
        if (!isChangingConfigurations) (application as LerguieApp).container.speaker.stop()
    }
}
