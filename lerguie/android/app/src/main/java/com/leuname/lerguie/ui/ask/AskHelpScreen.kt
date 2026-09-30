package com.leuname.lerguie.ui.ask

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.RecordVoiceOver
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import com.leuname.lerguie.R
import com.leuname.lerguie.core.haptics.HapticEvent
import com.leuname.lerguie.core.speech.SpeechListener
import com.leuname.lerguie.i18n.LanguagePacks
import com.leuname.lerguie.ui.appContainer
import com.leuname.lerguie.ui.components.BigButton
import com.leuname.lerguie.ui.components.ButtonKind
import com.leuname.lerguie.ui.components.InfoBanner
import com.leuname.lerguie.ui.components.LerguieHeader
import com.leuname.lerguie.ui.components.hasPermission
import com.leuname.lerguie.ui.navigation.Routes
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull

/**
 * "Quero um leite": a tela é dividida em duas metades enormes (fáceis de achar sem enxergar):
 * EM CIMA — perguntar a alguém por perto (o Lerguie fala a pergunta, ouve a resposta e repete);
 * EMBAIXO — procurar com a câmera.
 */
@Composable
fun AskHelpScreen(nav: NavHostController, item: String) {
    val context = LocalContext.current
    val container = appContainer()
    val scope = rememberCoroutineScope()
    val pack = LanguagePacks.current()
    val listener = remember { SpeechListener(context) { !container.connectivity.isOnline() } }
    DisposableEffect(Unit) { onDispose { listener.release() } }
    val listen by listener.state.collectAsStateWithLifecycle()
    var answer by remember { mutableStateOf<String?>(null) }
    val intro = stringResource(R.string.ask_intro, item)
    val noAnswer = stringResource(R.string.ask_no_answer)

    LaunchedEffect(Unit) { container.speaker.speak(intro, "ask-intro") }

    fun ask() {
        answer = null
        scope.launch {
            container.speaker.speak(pack.askQuestion(item), "ask")
            // Espera terminar de falar antes de abrir o microfone (senão ele ouviria a própria voz).
            withTimeoutOrNull(3000) { container.speaker.state.first { it.speakingId == "ask" } }
            withTimeoutOrNull(15000) { container.speaker.state.first { it.speakingId != "ask" } }
            if (!context.hasPermission(android.Manifest.permission.RECORD_AUDIO)) return@launch
            container.haptics.play(HapticEvent.CONFIRM)
            listener.start(continuous = false) { heard ->
                answer = heard
                container.haptics.play(HapticEvent.MESSAGE)
                container.speaker.speak(pack.theyAnswered(heard) + ". " + context.getString(R.string.ask_after_answer), "answer")
                container.session.lastSpoken = pack.theyAnswered(heard)
            }
        }
    }

    LaunchedEffect(listen.error) { if (listen.error != null) container.speaker.speak(noAnswer) }

    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        LerguieHeader(onBack = { nav.popBackStack() })
        Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(stringResource(R.string.ask_title, item), style = MaterialTheme.typography.headlineSmall, color = MaterialTheme.colorScheme.onBackground)
            answer?.let {
                InfoBanner(pack.theyAnswered(it), Modifier.semantics { liveRegion = LiveRegionMode.Polite })
            }
            if (listen.listening) InfoBanner(stringResource(R.string.ask_listening))
            BigButton(
                stringResource(if (answer == null) R.string.ask_someone else R.string.ask_again), Icons.Filled.RecordVoiceOver,
                { ask() }, Modifier.fillMaxWidth().weight(1f), ButtonKind.SECONDARY, vertical = true,
            )
            BigButton(
                stringResource(R.string.ask_camera, item), Icons.Filled.CameraAlt,
                { nav.navigate(Routes.see(find = item)) }, Modifier.fillMaxWidth().weight(1f), ButtonKind.PRIMARY, vertical = true,
            )
        }
    }
}
