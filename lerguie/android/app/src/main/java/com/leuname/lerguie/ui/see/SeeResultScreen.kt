package com.leuname.lerguie.ui.see

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Notes
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DirectionsRun
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.HelpOutline
import androidx.compose.material.icons.filled.Palette
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import com.leuname.lerguie.R
import com.leuname.lerguie.ai.vision.Confidence
import com.leuname.lerguie.ai.vision.SceneSpeech
import com.leuname.lerguie.ai.vision.VisionNotice
import com.leuname.lerguie.ai.vision.VisionResult
import com.leuname.lerguie.ai.vision.VisionSource
import com.leuname.lerguie.core.haptics.HapticEvent
import com.leuname.lerguie.core.util.Sharing
import com.leuname.lerguie.core.voice.VoiceCommand
import com.leuname.lerguie.data.db.HistoryCategory
import com.leuname.lerguie.ui.appContainer
import com.leuname.lerguie.ui.components.ActionGrid
import com.leuname.lerguie.ui.components.BigButton
import com.leuname.lerguie.ui.components.ButtonKind
import com.leuname.lerguie.ui.components.CapturedImage
import com.leuname.lerguie.ui.components.HeaderAction
import com.leuname.lerguie.ui.components.InfoBanner
import com.leuname.lerguie.ui.components.LerguieHeader
import com.leuname.lerguie.ui.components.ResultSection
import com.leuname.lerguie.ui.components.SpeakButton
import com.leuname.lerguie.ui.theme.LocalUiPrefs
import com.leuname.lerguie.ui.theme.Palette
import kotlinx.coroutines.launch

@Composable
fun SeeResultScreen(nav: NavHostController) {
    val container = appContainer()
    val context = LocalContext.current
    val session = container.session.see
    if (session == null) {
        LaunchedEffect(Unit) { nav.popBackStack() }
        return
    }
    val speaker by container.speaker.state.collectAsStateWithLifecycle()
    val autoRead = LocalUiPrefs.current.autoRead
    val scope = rememberCoroutineScope()
    var saved by remember { mutableStateOf(false) }
    val notRecognized = stringResource(R.string.see_not_recognized)
    val savedMsg = stringResource(R.string.saved)
    val shareTitle = stringResource(R.string.share)

    val result = session.result
    val fullText = when (result) {
        is VisionResult.Success -> SceneSpeech.compose(result.scene)
        VisionResult.NotRecognized -> notRecognized
        is VisionResult.Failure -> stringResource(R.string.error_analysis)
    }

    fun speakAll() {
        container.speaker.speak(fullText, "all")
        container.session.lastSpoken = fullText
    }

    fun save() {
        if (result !is VisionResult.Success) return
        scope.launch {
            session.historyId = container.history.saveFavorite(
                session.historyId, HistoryCategory.DESCRIPTION, SceneSpeech.headline(result.scene), fullText, session.image,
            )
            saved = true
            container.haptics.play(HapticEvent.SUCCESS)
            container.speaker.speak(savedMsg)
        }
    }

    LaunchedEffect(session) { if (autoRead) speakAll() }
    LaunchedEffect(Unit) {
        container.voiceCommands.commands.collect { cmd ->
            when (cmd) {
                VoiceCommand.REPEAT -> speakAll()
                VoiceCommand.SAVE -> save()
                else -> Unit
            }
        }
    }

    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        LerguieHeader(onBack = { nav.popBackStack() }) {
            HeaderAction(Icons.AutoMirrored.Filled.VolumeUp, stringResource(R.string.listen_all)) { speakAll() }
        }
        Column(
            Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            CapturedImage(session.image)
            when (result) {
                is VisionResult.Success -> {
                    val scene = result.scene
                    result.notice?.let { InfoBanner(stringResource(noticeText(it))) }
                    val speakSection: @Composable (String, String) -> Unit = { id, text ->
                        SpeakButton(
                            label = text, speaking = speaker.speakingId == id,
                            onSpeak = { container.speaker.speak(text, id) }, onStop = { container.speaker.stop() },
                        )
                    }
                    if (scene.hazards.isNotEmpty()) {
                        val t = scene.hazards.joinToString(". ")
                        ResultSection(Icons.Filled.Warning, MaterialTheme.colorScheme.error, stringResource(R.string.section_alert), t) { speakSection("hz", t) }
                    }
                    val headline = SceneSpeech.headline(scene)
                    ResultSection(
                        if (scene.confidence == Confidence.LOW) Icons.Filled.HelpOutline else Icons.Filled.CheckCircle,
                        if (scene.confidence == Confidence.LOW) Palette.Orange else Palette.Success,
                        stringResource(R.string.section_identified), headline, highlighted = true,
                    ) { speakSection("id", headline) }
                    if (scene.description.isNotBlank()) ResultSection(Icons.AutoMirrored.Filled.Notes, Palette.Violet, stringResource(R.string.section_description), scene.description) { speakSection("desc", scene.description) }
                    if (scene.environment.isNotBlank()) ResultSection(Icons.Filled.Place, Palette.Orange, stringResource(R.string.section_environment), scene.environment) { speakSection("env", scene.environment) }
                    if (scene.action.isNotBlank()) ResultSection(Icons.Filled.DirectionsRun, Palette.Pink, stringResource(R.string.section_action), scene.action) { speakSection("act", scene.action) }
                    if (scene.colors.isNotBlank()) ResultSection(Icons.Filled.Palette, Palette.Violet, stringResource(R.string.section_colors), scene.colors) { speakSection("col", scene.colors) }
                    Text(
                        stringResource(
                            R.string.confidence_line,
                            stringResource(confidenceText(scene.confidence)),
                            stringResource(if (scene.source == VisionSource.CLOUD) R.string.source_cloud else R.string.source_device),
                        ),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onBackground,
                    )
                }
                else -> InfoBanner(fullText, warning = true)
            }
        }
        Column(Modifier.navigationBarsPadding().padding(16.dp)) {
            ActionGrid(
                    { m -> BigButton(stringResource(R.string.take_another), Icons.Filled.CameraAlt, { nav.popBackStack() }, m) },
                    { m -> BigButton(stringResource(if (saved) R.string.saved else R.string.save), Icons.Filled.Favorite, { save() }, m, enabled = result is VisionResult.Success && !saved) },
                    { m -> BigButton(shareTitle, Icons.Filled.Share, { Sharing.shareText(context, fullText, shareTitle) }, m) },
                    { m -> BigButton(stringResource(R.string.listen_again), Icons.AutoMirrored.Filled.VolumeUp, { speakAll() }, m, ButtonKind.PRIMARY) },
            )
        }
    }
}

fun noticeText(n: VisionNotice): Int = when (n) {
    VisionNotice.OFFLINE_SIMPLIFIED -> R.string.notice_offline
    VisionNotice.CLOUD_FAILED_SIMPLIFIED -> R.string.notice_cloud_failed
    VisionNotice.QUOTA_SIMPLIFIED -> R.string.notice_quota
    VisionNotice.ERROR -> R.string.error_analysis
}

fun confidenceText(c: Confidence): Int = when (c) {
    Confidence.HIGH -> R.string.confidence_high
    Confidence.MEDIUM -> R.string.confidence_medium
    Confidence.LOW -> R.string.confidence_low
}
