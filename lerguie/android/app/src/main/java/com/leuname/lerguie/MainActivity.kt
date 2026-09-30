package com.leuname.lerguie

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.getValue
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.leuname.lerguie.core.settings.AppSettings
import com.leuname.lerguie.ui.navigation.LerguieNavHost
import com.leuname.lerguie.ui.theme.LerguieTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val container = (application as LerguieApp).container
        setContent {
            val settings by container.settings.settings.collectAsStateWithLifecycle(initialValue = AppSettings())
            LerguieTheme(settings) {
                LerguieNavHost()
            }
        }
    }

    override fun onStop() {
        super.onStop()
        // Ao sair do app nada continua falando.
        if (!isChangingConfigurations) (application as LerguieApp).container.speaker.stop()
    }
}
