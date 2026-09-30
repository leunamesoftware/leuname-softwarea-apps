package com.leuname.lerguie.ui.components

import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardVoice
import androidx.compose.material.icons.filled.MicOff
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import com.leuname.lerguie.R
import com.leuname.lerguie.core.haptics.HapticEvent
import com.leuname.lerguie.core.speech.SpeechListener
import com.leuname.lerguie.core.voice.VoiceCommand
import com.leuname.lerguie.core.voice.VoiceCommandParser
import com.leuname.lerguie.ui.appContainer
import com.leuname.lerguie.ui.navigation.handleVoiceNavigation

/**
 * Botão "Comando de voz": escuta UMA frase (nunca fica ouvindo escondido),
 * navega ou repassa "repetir/salvar/parar" para a tela atual.
 */
@Composable
fun VoiceCommandButton(nav: NavHostController) {
    val context = LocalContext.current
    val container = appContainer()
    val listener = remember { SpeechListener(context) { !container.connectivity.isOnline() } }
    DisposableEffect(Unit) { onDispose { listener.release() } }
    val state by listener.state.collectAsStateWithLifecycle()
    val notUnderstood = stringResource(R.string.voice_not_understood)

    fun start() {
        container.speaker.stop()
        // Só vibração ao iniciar: uma fala aqui seria captada pelo próprio microfone.
        container.haptics.play(HapticEvent.CONFIRM)
        listener.start(continuous = false) { spoken ->
            when (val cmd = VoiceCommandParser.parse(spoken)) {
                null -> {
                    container.haptics.play(HapticEvent.ERROR)
                    container.speaker.speak(notUnderstood)
                }
                VoiceCommand.REPEAT -> container.session.lastSpoken?.let { container.speaker.speak(it) }
                VoiceCommand.STOP -> container.speaker.stop()
                else -> if (!nav.handleVoiceNavigation(cmd)) container.voiceCommands.emit(cmd)
            }
        }
    }

    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { ok -> if (ok) start() }
    HeaderAction(
        icon = if (state.listening) Icons.Filled.MicOff else Icons.Filled.KeyboardVoice,
        label = stringResource(if (state.listening) R.string.voice_stop else R.string.voice_command),
        onClick = {
            when {
                state.listening -> listener.stop()
                context.hasPermission(Manifest.permission.RECORD_AUDIO) -> start()
                else -> launcher.launch(Manifest.permission.RECORD_AUDIO)
            }
        },
    )
}
