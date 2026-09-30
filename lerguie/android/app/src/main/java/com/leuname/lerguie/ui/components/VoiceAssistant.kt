package com.leuname.lerguie.ui.components

import android.Manifest
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import com.leuname.lerguie.R
import com.leuname.lerguie.core.haptics.HapticEvent
import com.leuname.lerguie.core.speech.ListenState
import com.leuname.lerguie.core.speech.SpeechListener
import com.leuname.lerguie.core.voice.VoiceCommand
import com.leuname.lerguie.core.voice.VoiceCommandParser
import com.leuname.lerguie.i18n.LanguagePacks
import com.leuname.lerguie.ui.appContainer
import com.leuname.lerguie.ui.navigation.Routes
import com.leuname.lerguie.ui.navigation.handleVoiceNavigation
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private class AssistantSession {
    val heard = StringBuilder()
    var stopping = false
}

/** Assistente de voz: ouve enquanto o botão é segurado e executa o pedido ao soltar. */
class VoiceAssistant(val state: ListenState, val start: () -> Unit, val stop: () -> Unit)

/**
 * Ouve enquanto o botão está pressionado; ao soltar, entrega o texto completo em [onResult].
 * Nunca fica ligado sozinho.
 */
@Composable
fun rememberHoldListener(onResult: (String) -> Unit): VoiceAssistant {
    val context = LocalContext.current
    val container = appContainer()
    val scope = rememberCoroutineScope()
    val listener = remember { SpeechListener(context) { !container.connectivity.isOnline() } }
    DisposableEffect(Unit) { onDispose { listener.release() } }
    val state by listener.state.collectAsStateWithLifecycle()
    val session = remember { AssistantSession() }
    val deliver by rememberUpdatedState(onResult)

    fun finish() {
        if (!session.stopping) return
        session.stopping = false
        val text = session.heard.toString().trim()
        if (text.isNotBlank()) deliver(text)
    }

    val start = {
        container.speaker.stop()
        session.heard.clear()
        session.stopping = false
        // Só vibração ao iniciar: uma fala aqui seria captada pelo próprio microfone.
        container.haptics.play(HapticEvent.CONFIRM)
        listener.start(continuous = true) { phrase ->
            session.heard.append(' ').append(phrase)
            finish()
        }
    }
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { }
    return VoiceAssistant(
        state = state,
        start = {
            if (context.hasPermission(Manifest.permission.RECORD_AUDIO)) start()
            else launcher.launch(Manifest.permission.RECORD_AUDIO)
        },
        stop = {
            if (listener.state.value.listening) {
                val partial = listener.state.value.partial
                session.stopping = true
                listener.stop()
                container.haptics.play(HapticEvent.CONFIRM)
                // O resultado final chega logo após soltar; se demorar, usa o parcial.
                scope.launch {
                    delay(1500)
                    if (session.stopping) {
                        if (partial.isNotBlank()) session.heard.append(' ').append(partial)
                        finish()
                    }
                }
            }
        },
    )
}

/** Assistente de voz da tela inicial: segure, fale o pedido e solte. */
@Composable
fun rememberVoiceAssistant(nav: NavHostController): VoiceAssistant {
    val context = LocalContext.current
    val container = appContainer()
    val scope = rememberCoroutineScope()
    val notUnderstood = stringResource(R.string.voice_not_understood)

    fun act(spoken: String) {
        val pack = LanguagePacks.current()
        val parsed = VoiceCommandParser.parseFull(spoken, pack)
        when (parsed?.command) {
            null -> {
                container.haptics.play(HapticEvent.ERROR)
                container.speaker.speak(notUnderstood)
            }
            VoiceCommand.REPEAT -> container.session.lastSpoken?.let { container.speaker.speak(it) }
            VoiceCommand.STOP -> container.speaker.stop()
            VoiceCommand.FIND -> {
                val item = parsed.argument.orEmpty()
                container.haptics.play(HapticEvent.CONFIRM)
                // Perguntar a alguém ou procurar com a câmera (tela dividida em duas metades).
                nav.navigate(Routes.ask(item))
            }
            VoiceCommand.NAVIGATE -> {
                val place = parsed.argument.orEmpty()
                container.haptics.play(HapticEvent.CONFIRM)
                container.speaker.speak(pack.navigatingStart(place))
                scope.launch {
                    delay(4500) // deixa a frase terminar antes de abrir o mapa
                    openWalkingNavigation(context, place)
                }
            }
            else -> if (!nav.handleVoiceNavigation(parsed.command)) container.voiceCommands.emit(parsed.command)
        }
    }
    return rememberHoldListener { act(it) }
}

/** Navegação a pé falada (Google Maps); sem Maps, abre qualquer app de mapas. */
fun openWalkingNavigation(context: Context, place: String) {
    val q = Uri.encode(place)
    val maps = Intent(Intent.ACTION_VIEW, Uri.parse("google.navigation:q=$q&mode=w"))
        .setPackage("com.google.android.apps.maps").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    try {
        context.startActivity(maps)
    } catch (e: ActivityNotFoundException) {
        runCatching {
            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("geo:0,0?q=$q")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        }
    }
}
