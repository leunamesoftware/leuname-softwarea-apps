package com.leuname.lerguie.ui.communicate

import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.Keyboard
import androidx.compose.material.icons.filled.PanTool
import androidx.compose.material.icons.filled.RecordVoiceOver
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.SlowMotionVideo
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringArrayResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import com.leuname.lerguie.R
import com.leuname.lerguie.ai.libras.ModuleStatus
import com.leuname.lerguie.core.settings.AppSettings
import com.leuname.lerguie.core.settings.DisplayPreference
import com.leuname.lerguie.core.speech.SpeechListener
import com.leuname.lerguie.core.util.Sharing
import com.leuname.lerguie.core.voice.VoiceCommand
import com.leuname.lerguie.ui.appContainer
import com.leuname.lerguie.ui.components.BigButton
import com.leuname.lerguie.ui.components.ButtonKind
import com.leuname.lerguie.ui.components.InfoBanner
import com.leuname.lerguie.ui.components.LerguieHeader
import com.leuname.lerguie.ui.components.MicButton
import com.leuname.lerguie.ui.components.ModeOption
import com.leuname.lerguie.ui.components.ModeSelector
import com.leuname.lerguie.ui.components.SpeakButton
import com.leuname.lerguie.ui.components.hasPermission
import com.leuname.lerguie.ui.lerguieViewModel
import com.leuname.lerguie.ui.listen.listenErrorText
import com.leuname.lerguie.ui.theme.LocalBrand

private enum class InputTab { LIBRAS, TYPE, PHRASES }

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun CommunicateScreen(nav: NavHostController) {
    val context = LocalContext.current
    val container = appContainer()
    val vm = lerguieViewModel { CommunicateViewModel(it) }
    val state by vm.state.collectAsStateWithLifecycle()
    val settings by container.settings.settings.collectAsStateWithLifecycle(AppSettings())
    val speaker by container.speaker.state.collectAsStateWithLifecycle()
    val listener = remember { SpeechListener(context) { !container.connectivity.isOnline() } }
    DisposableEffect(Unit) { onDispose { listener.release() } }
    val listen by listener.state.collectAsStateWithLifecycle()
    var tab by rememberSaveable { mutableStateOf(InputTab.PHRASES) }
    var fullscreen by remember { mutableStateOf<String?>(null) }
    val phrases = stringArrayResource(R.array.quick_phrases)
    val meLabel = stringResource(R.string.conversation_me)
    val otherLabel = stringResource(R.string.conversation_other)
    val shareTitle = stringResource(R.string.share)

    fun startListening() {
        container.speaker.stop()
        listener.start(continuous = false) { vm.addReply(it, settings.speakReplies) }
    }
    val micLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { if (it) startListening() }

    LaunchedEffect(Unit) {
        container.voiceCommands.commands.collect { cmd ->
            when (cmd) {
                VoiceCommand.REPEAT -> vm.repeatReply(slower = false)
                VoiceCommand.SAVE -> vm.save(meLabel, otherLabel)
                else -> Unit
            }
        }
    }

    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        LerguieHeader(onBack = { nav.popBackStack() })
        Column(
            Modifier.fillMaxSize().navigationBarsPadding().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            // ---------- Eu me comunico ----------
            Panel(Icons.Filled.PanTool, LocalBrand.current.readGradient.first(), stringResource(R.string.comm_me_title), stringResource(R.string.comm_me_desc)) {
                ModeSelector(
                    listOf(
                        ModeOption(InputTab.LIBRAS, stringResource(R.string.comm_tab_libras), Icons.Filled.PanTool),
                        ModeOption(InputTab.TYPE, stringResource(R.string.comm_tab_type), Icons.Filled.Keyboard),
                        ModeOption(InputTab.PHRASES, stringResource(R.string.comm_tab_phrases), Icons.AutoMirrored.Filled.Chat),
                    ),
                    tab, { tab = it },
                )
                when (tab) {
                    InputTab.LIBRAS -> LibrasUnavailable(container.signRecognizer.status, stringResource(R.string.libras_recognition_unavailable))
                    InputTab.TYPE -> OutlinedTextField(
                        value = state.draft, onValueChange = vm::setDraft,
                        label = { Text(stringResource(R.string.comm_type_label)) },
                        textStyle = MaterialTheme.typography.headlineSmall,
                        modifier = Modifier.fillMaxWidth().heightIn(min = 120.dp),
                    )
                    InputTab.PHRASES -> FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        phrases.forEach { p ->
                            Surface(
                                shape = RoundedCornerShape(14.dp), color = MaterialTheme.colorScheme.surfaceVariant,
                                modifier = Modifier.heightIn(min = 52.dp).clickable(role = Role.Button) { vm.speakMine(p) },
                            ) {
                                Text(p, style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(14.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
                if (tab == InputTab.TYPE) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        BigButton(stringResource(R.string.comm_speak_to_other), Icons.Filled.RecordVoiceOver, { vm.speakMine() }, Modifier.weight(1f), ButtonKind.PRIMARY, enabled = state.draft.isNotBlank())
                        BigButton(stringResource(R.string.fullscreen), Icons.Filled.Fullscreen, { fullscreen = state.draft }, Modifier.weight(0.6f), ButtonKind.TONAL, enabled = state.draft.isNotBlank(), vertical = true)
                    }
                }
            }

            // ---------- Entendo a resposta ----------
            Panel(Icons.Filled.RecordVoiceOver, LocalBrand.current.listenGradient.first(), stringResource(R.string.comm_other_title), stringResource(R.string.comm_other_desc)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    MicButton(
                        listening = listen.listening, level = listen.level, size = 88.dp,
                        label = stringResource(if (listen.listening) R.string.listen_stop else R.string.comm_listen_other),
                        onClick = {
                            when {
                                listen.listening -> listener.stop()
                                context.hasPermission(Manifest.permission.RECORD_AUDIO) -> startListening()
                                else -> micLauncher.launch(Manifest.permission.RECORD_AUDIO)
                            }
                        },
                    )
                    Spacer(Modifier.width(14.dp))
                    Text(
                        if (listen.listening) listen.partial.ifBlank { stringResource(R.string.comm_listening_other) }
                        else stringResource(R.string.comm_tap_mic),
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.weight(1f).semantics { liveRegion = LiveRegionMode.Polite },
                    )
                }
                listen.error?.let { InfoBanner(stringResource(listenErrorText(it)), warning = true) }
                val reply = state.lastReply
                if (reply != null) {
                    if (settings.displayPreference != DisplayPreference.LIBRAS) {
                        Surface(shape = RoundedCornerShape(16.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
                            Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    "“$reply”", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Medium,
                                    modifier = Modifier.weight(1f).semantics { liveRegion = LiveRegionMode.Polite },
                                )
                                SpeakButton(reply, speaker.speakingId == "reply", { vm.repeatReply(false) }, { container.speaker.stop() })
                            }
                        }
                    }
                    if (settings.displayPreference != DisplayPreference.TEXT) {
                        LibrasUnavailable(container.signPresenter.status, stringResource(R.string.libras_presentation_unavailable))
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        BigButton(stringResource(R.string.listen_again), Icons.AutoMirrored.Filled.VolumeUp, { vm.repeatReply(false) }, Modifier.weight(1f), ButtonKind.TONAL, vertical = true)
                        BigButton(stringResource(R.string.slower), Icons.Filled.SlowMotionVideo, { vm.repeatReply(true) }, Modifier.weight(1f), ButtonKind.TONAL, vertical = true)
                        BigButton(stringResource(R.string.fullscreen), Icons.Filled.Fullscreen, { fullscreen = reply }, Modifier.weight(1f), ButtonKind.TONAL, vertical = true)
                    }
                }
            }

            // ---------- Conversa ----------
            if (state.messages.isNotEmpty()) {
                Text(stringResource(R.string.conversation_title), style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.semantics { heading() })
                state.messages.forEach { m ->
                    val mine = m.from == Party.ME
                    Box(Modifier.fillMaxWidth(), contentAlignment = if (mine) Alignment.CenterEnd else Alignment.CenterStart) {
                        Surface(
                            shape = RoundedCornerShape(18.dp),
                            color = if (mine) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface,
                            modifier = Modifier.fillMaxWidth(0.85f),
                        ) {
                            Column(Modifier.padding(12.dp).semantics(mergeDescendants = true) {}) {
                                Text(if (mine) meLabel else otherLabel, style = MaterialTheme.typography.labelLarge)
                                Text(m.text, style = MaterialTheme.typography.bodyLarge)
                            }
                        }
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    BigButton(stringResource(if (state.saved) R.string.saved else R.string.save), Icons.Filled.Favorite, { vm.save(meLabel, otherLabel) }, Modifier.weight(1f), enabled = !state.saved, vertical = true)
                    BigButton(shareTitle, Icons.Filled.Share, { Sharing.shareText(context, vm.transcript(meLabel, otherLabel), shareTitle) }, Modifier.weight(1f), vertical = true)
                    BigButton(stringResource(R.string.clear), Icons.Filled.Delete, { vm.clear() }, Modifier.weight(1f), vertical = true)
                }
            }
        }
    }

    fullscreen?.let { text ->
        Dialog(onDismissRequest = { fullscreen = null }, properties = DialogProperties(usePlatformDefaultWidth = false)) {
            Box(
                Modifier.fillMaxSize().background(Color.Black).clickable(role = Role.Button) { fullscreen = null }.padding(24.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(text, color = Color.White, style = MaterialTheme.typography.displayMedium, textAlign = TextAlign.Center)
            }
        }
    }
}

@Composable
private fun Panel(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    iconBg: Color,
    title: String,
    subtitle: String,
    content: @Composable () -> Unit,
) {
    Surface(shape = RoundedCornerShape(24.dp), color = MaterialTheme.colorScheme.surface, modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(vertical = 16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(Modifier.padding(horizontal = 16.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(52.dp).background(iconBg, RoundedCornerShape(14.dp)), contentAlignment = Alignment.Center) {
                    Icon(icon, null, tint = Color.White, modifier = Modifier.size(30.dp))
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.semantics(mergeDescendants = true) { heading() }) {
                    Text(title, style = MaterialTheme.typography.titleLarge)
                    Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            Column(Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) { content() }
        }
    }
}

/** Estado honesto do módulo de Libras: nunca simula reconhecimento/tradução. */
@Composable
private fun LibrasUnavailable(status: ModuleStatus, text: String) {
    if (status == ModuleStatus.NOT_AVAILABLE) InfoBanner(text, icon = Icons.Filled.PanTool)
}
