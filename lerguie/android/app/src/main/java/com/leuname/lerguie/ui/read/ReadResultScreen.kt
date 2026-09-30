package com.leuname.lerguie.ui.read

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.QrCode
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.TextDecrease
import androidx.compose.material.icons.filled.TextIncrease
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import com.leuname.lerguie.R
import com.leuname.lerguie.ai.ocr.OcrResult
import com.leuname.lerguie.core.haptics.HapticEvent
import com.leuname.lerguie.core.settings.AppSettings
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
fun ReadResultScreen(nav: NavHostController) {
    val container = appContainer()
    val context = LocalContext.current
    val session = container.session.read
    if (session == null) {
        LaunchedEffect(Unit) { nav.popBackStack() }
        return
    }
    val speaker by container.speaker.state.collectAsStateWithLifecycle()
    val settings by container.settings.settings.collectAsStateWithLifecycle(AppSettings())
    val autoRead = LocalUiPrefs.current.autoRead
    val scope = rememberCoroutineScope()
    var saved by remember { mutableStateOf(false) }
    var fontScale by remember { mutableFloatStateOf(1f) }
    var resumeFrom by remember { mutableIntStateOf(0) }
    val savedMsg = stringResource(R.string.saved)
    val shareTitle = stringResource(R.string.share)
    val copiedMsg = stringResource(R.string.copied)
    val noText = stringResource(R.string.read_no_text)
    val noBarcode = stringResource(R.string.read_no_barcode)

    val ocr = session.ocr as? OcrResult.Success
    val barcodeText = session.barcode?.let { b -> listOfNotNull(session.productName, b.value).joinToString(" — ") }
    val fullText = ocr?.fullText ?: barcodeText
    val segments: List<Pair<String, String>> = ocr?.blocks?.map { "b${it.id}" to it.text }
        ?: listOf("b0" to (barcodeText ?: if (session.barcode == null && session.ocr == null) noBarcode else noText))

    fun speakFrom(index: Int) {
        val from = index.coerceIn(0, segments.lastIndex)
        container.speaker.speakAll(segments.drop(from))
        container.session.lastSpoken = segments.drop(from).joinToString(" ") { it.second }
    }

    fun save() {
        val text = fullText ?: return
        scope.launch {
            val category = if (session.barcode != null) HistoryCategory.BARCODE else HistoryCategory.READING
            session.historyId = container.history.saveFavorite(session.historyId, category, text.lineSequence().first().take(80), text, session.image)
            saved = true
            container.haptics.play(HapticEvent.SUCCESS)
            container.speaker.speak(savedMsg)
        }
    }

    // Guarda o bloco atual para "continuar" de onde parou.
    LaunchedEffect(speaker.speakingId) {
        val idx = segments.indexOfFirst { it.first == speaker.speakingId }
        if (idx >= 0) resumeFrom = idx
    }
    LaunchedEffect(session) { if (autoRead) speakFrom(0) }
    LaunchedEffect(Unit) {
        container.voiceCommands.commands.collect { cmd ->
            when (cmd) {
                VoiceCommand.REPEAT -> speakFrom(0)
                VoiceCommand.SAVE -> save()
                else -> Unit
            }
        }
    }

    val speaking = speaker.speakingId?.startsWith("b") == true
    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        LerguieHeader(onBack = { nav.popBackStack() }) {
            HeaderAction(Icons.AutoMirrored.Filled.VolumeUp, stringResource(R.string.listen_all)) { speakFrom(0) }
        }
        Column(
            Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            CapturedImage(session.image)
            if (session.barcode != null) {
                ResultSection(Icons.Filled.QrCode, Palette.Violet, stringResource(R.string.barcode_found), barcodeText.orEmpty())
            } else if (ocr != null) {
                Text(stringResource(R.string.text_identified), style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onBackground)
                if (ocr.hasUncertainParts) InfoBanner(stringResource(R.string.ocr_uncertain_warning), warning = true)
                Surface(shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surface) {
                    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        ocr.blocks.forEach { block ->
                            val id = "b${block.id}"
                            val active = speaker.speakingId == id
                            Row(verticalAlignment = Alignment.Top) {
                                Text(
                                    block.text,
                                    style = MaterialTheme.typography.bodyLarge.let { it.copy(fontSize = it.fontSize * fontScale, lineHeight = it.lineHeight * fontScale) },
                                    color = if (active) Palette.Ink else MaterialTheme.colorScheme.onSurface,
                                    modifier = Modifier
                                        .weight(1f)
                                        .background(if (active) Palette.Highlight else MaterialTheme.colorScheme.surface, RoundedCornerShape(6.dp))
                                        .padding(6.dp),
                                )
                                Spacer(Modifier.width(8.dp))
                                SpeakButton(block.text.take(40), active, { container.speaker.speak(block.text, id) }, { container.speaker.stop() })
                            }
                        }
                    }
                }
            } else {
                InfoBanner(segments.first().second, warning = true)
            }

            if (fullText != null) {
                ReadingControls(
                    speaking = speaking,
                    rate = settings.speechRate,
                    onRate = { r -> scope.launch { container.settings.update { it.copy(speechRate = r) } } },
                    onPauseResume = { if (speaking) container.speaker.stop() else speakFrom(resumeFrom) },
                    onSmaller = { fontScale = (fontScale - 0.15f).coerceAtLeast(0.8f) },
                    onBigger = { fontScale = (fontScale + 0.15f).coerceAtMost(2.5f) },
                )
            }
        }
        Column(Modifier.navigationBarsPadding().padding(16.dp)) {
            ActionGrid(
                { m ->
                    BigButton(stringResource(R.string.copy_text), Icons.Filled.ContentCopy, {
                        fullText?.let { Sharing.copy(context, it); container.speaker.speak(copiedMsg) }
                    }, m, enabled = fullText != null)
                },
                { m -> BigButton(shareTitle, Icons.Filled.Share, { fullText?.let { Sharing.shareText(context, it, shareTitle) } }, m, enabled = fullText != null) },
                { m -> BigButton(stringResource(if (saved) R.string.saved else R.string.save), Icons.Filled.Favorite, { save() }, m, enabled = fullText != null && !saved) },
                { m -> BigButton(stringResource(R.string.listen_again), Icons.AutoMirrored.Filled.VolumeUp, { speakFrom(0) }, m, ButtonKind.PRIMARY) },
            )
        }
    }
}

@Composable
private fun ReadingControls(
    speaking: Boolean,
    rate: Float,
    onRate: (Float) -> Unit,
    onPauseResume: () -> Unit,
    onSmaller: () -> Unit,
    onBigger: () -> Unit,
) {
    Surface(shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
        Column(Modifier.fillMaxWidth().padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                BigButton(
                    stringResource(if (speaking) R.string.pause else R.string.resume),
                    if (speaking) Icons.Filled.Pause else Icons.Filled.PlayArrow, onPauseResume, Modifier.weight(1f), ButtonKind.TONAL,
                )
                BigButton(stringResource(R.string.text_smaller), Icons.Filled.TextDecrease, onSmaller, Modifier.weight(1f), ButtonKind.TONAL)
                BigButton(stringResource(R.string.text_bigger), Icons.Filled.TextIncrease, onBigger, Modifier.weight(1f), ButtonKind.TONAL)
            }
            val rateLabel = stringResource(R.string.speech_rate_value, rate)
            Text(rateLabel, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Slider(
                value = rate, onValueChange = onRate, valueRange = 0.5f..2f, steps = 5,
                modifier = Modifier.semantics {
                    contentDescription = rateLabel
                    stateDescription = rateLabel
                },
            )
        }
    }
}
