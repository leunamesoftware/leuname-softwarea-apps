package com.leuname.lerguie.ui.listen

import android.Manifest
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
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
import com.leuname.lerguie.core.speech.ListenError
import com.leuname.lerguie.core.speech.SpeechListener
import com.leuname.lerguie.core.util.Sharing
import com.leuname.lerguie.core.voice.VoiceCommand
import com.leuname.lerguie.data.db.HistoryCategory
import com.leuname.lerguie.ui.appContainer
import com.leuname.lerguie.ui.components.ActionGrid
import com.leuname.lerguie.ui.components.BigButton
import com.leuname.lerguie.ui.components.InfoBanner
import com.leuname.lerguie.ui.components.LerguieHeader
import com.leuname.lerguie.ui.components.MicButton
import com.leuname.lerguie.ui.components.PermissionGate
import com.leuname.lerguie.ui.components.SpeakButton
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun ListenScreen(nav: NavHostController) {
    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        LerguieHeader(onBack = { nav.popBackStack() })
        PermissionGate(
            permission = Manifest.permission.RECORD_AUDIO,
            title = stringResource(R.string.permission_mic_title),
            reason = stringResource(R.string.permission_mic_listen),
        ) { ListenContent(nav) }
    }
}

fun listenErrorText(e: ListenError): Int = when (e) {
    ListenError.NO_PERMISSION -> R.string.permission_mic_title
    ListenError.NETWORK -> R.string.listen_error_network
    ListenError.NOT_AVAILABLE -> R.string.listen_error_unavailable
    ListenError.BUSY -> R.string.listen_error_busy
    ListenError.OTHER -> R.string.listen_error_other
}

@Composable
private fun ListenContent(nav: NavHostController) {
    val context = LocalContext.current
    val container = appContainer()
    val listener = remember { SpeechListener(context) { !container.connectivity.isOnline() } }
    DisposableEffect(Unit) { onDispose { listener.release() } }
    val state by listener.state.collectAsStateWithLifecycle()
    val speaker by container.speaker.state.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    var transcript by rememberSaveable { mutableStateOf("") }
    var startedAt by remember { mutableLongStateOf(0L) }
    var elapsed by remember { mutableLongStateOf(0L) }
    var historyId by remember { mutableStateOf<Long?>(null) }
    var saved by remember { mutableStateOf(false) }
    val shareTitle = stringResource(R.string.share)
    val savedMsg = stringResource(R.string.saved)
    val copiedMsg = stringResource(R.string.copied)
    val title = stringResource(R.string.feature_listen)

    LaunchedEffect(state.listening) {
        while (state.listening) {
            elapsed = (System.currentTimeMillis() - startedAt) / 1000
            delay(500)
        }
    }

    fun toggle() {
        if (state.listening) {
            listener.stop()
            container.haptics.play(HapticEvent.CONFIRM)
            if (transcript.isNotBlank()) scope.launch {
                historyId = container.history.recordIfAllowed(HistoryCategory.SPEECH, transcript.take(80), transcript)
            }
        } else {
            container.speaker.stop()
            startedAt = System.currentTimeMillis()
            elapsed = 0
            saved = false
            container.haptics.play(HapticEvent.CONFIRM)
            listener.start(continuous = true) { phrase ->
                transcript = if (transcript.isBlank()) phrase else "$transcript\n$phrase"
                container.haptics.play(HapticEvent.MESSAGE)
            }
        }
    }

    fun save() {
        if (transcript.isBlank()) return
        scope.launch {
            historyId = container.history.saveFavorite(historyId, HistoryCategory.SPEECH, transcript.take(80), transcript)
            saved = true
            container.haptics.play(HapticEvent.SUCCESS)
        }
    }

    LaunchedEffect(Unit) {
        container.voiceCommands.commands.collect { cmd ->
            when (cmd) {
                VoiceCommand.REPEAT -> container.speaker.speak(transcript)
                VoiceCommand.SAVE -> save()
                else -> Unit
            }
        }
    }

    Column(
        Modifier.fillMaxSize().navigationBarsPadding().verticalScroll(rememberScrollState()).padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Text(
            stringResource(if (state.listening) R.string.listen_now else R.string.listen_tap_to_start),
            style = MaterialTheme.typography.headlineSmall,
            color = MaterialTheme.colorScheme.onBackground,
            modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
        )
        MicButton(
            listening = state.listening, level = state.level,
            label = stringResource(if (state.listening) R.string.listen_stop else R.string.listen_start),
            onClick = { toggle() },
        )
        if (state.listening) {
            Text(
                "%02d:%02d".format(elapsed / 60, elapsed % 60),
                style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onBackground,
            )
        }
        state.error?.let { InfoBanner(stringResource(listenErrorText(it)), warning = true) }
        InfoBanner(stringResource(R.string.listen_tip))

        Surface(shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surface, modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp).heightIn(min = 160.dp).semantics { liveRegion = LiveRegionMode.Polite }) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        stringResource(R.string.speech_to_text_title), style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f),
                    )
                    if (transcript.isNotBlank()) {
                        SpeakButton(
                            stringResource(R.string.speech_to_text_title), speaker.speakingId == "transcript",
                            { container.speaker.speak(transcript, "transcript") }, { container.speaker.stop() },
                        )
                    }
                }
                val shown = listOf(transcript, state.partial).filter { it.isNotBlank() }.joinToString("\n")
                Text(
                    shown.ifBlank { stringResource(R.string.speech_to_text_empty) },
                    style = MaterialTheme.typography.headlineSmall,
                    color = if (shown.isBlank()) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
                )
            }
        }
        val hasText = transcript.isNotBlank()
        ActionGrid(
            { m -> BigButton(stringResource(R.string.copy_text), Icons.Filled.ContentCopy, { Sharing.copy(context, transcript); container.speaker.speak(copiedMsg) }, m, enabled = hasText) },
            { m -> BigButton(shareTitle, Icons.Filled.Share, { Sharing.shareText(context, transcript, title) }, m, enabled = hasText) },
            { m -> BigButton(stringResource(if (saved) R.string.saved else R.string.save), Icons.Filled.Favorite, { save(); container.speaker.speak(savedMsg) }, m, enabled = hasText && !saved) },
            { m -> BigButton(stringResource(R.string.clear), Icons.Filled.Delete, { transcript = ""; historyId = null; saved = false }, m, enabled = hasText) },
        )
    }
}
