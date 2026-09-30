package com.leuname.lerguie.ui.read

import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.HelpOutline
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.Article
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import com.leuname.lerguie.R
import com.leuname.lerguie.ai.ocr.FramingHint
import com.leuname.lerguie.ai.ocr.ReadMode
import com.leuname.lerguie.core.settings.AppSettings
import com.leuname.lerguie.core.util.Bitmaps
import com.leuname.lerguie.ui.appContainer
import com.leuname.lerguie.ui.components.BusyIndicator
import com.leuname.lerguie.ui.components.CameraControls
import com.leuname.lerguie.ui.components.CameraHint
import com.leuname.lerguie.ui.components.CameraPreview
import com.leuname.lerguie.ui.components.FrameCorners
import com.leuname.lerguie.ui.components.HeaderAction
import com.leuname.lerguie.ui.components.InfoBanner
import com.leuname.lerguie.ui.components.LerguieHeader
import com.leuname.lerguie.ui.components.ModeOption
import com.leuname.lerguie.ui.components.ModeSelector
import com.leuname.lerguie.ui.components.PermissionGate
import com.leuname.lerguie.ui.components.ToggleRow
import com.leuname.lerguie.ui.components.capture
import com.leuname.lerguie.ui.components.rememberCameraController
import com.leuname.lerguie.ui.lerguieViewModel
import com.leuname.lerguie.ui.navigation.Routes
import kotlinx.coroutines.launch

@Composable
fun ReadScreen(nav: NavHostController, initialMode: String) {
    val container = appContainer()
    val hint = stringResource(R.string.read_hint)
    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        LerguieHeader(onBack = { nav.popBackStack() }) {
            HeaderAction(Icons.AutoMirrored.Filled.HelpOutline, stringResource(R.string.help)) { container.speaker.speak(hint) }
        }
        PermissionGate(
            permission = Manifest.permission.CAMERA,
            title = stringResource(R.string.permission_camera_title),
            reason = stringResource(R.string.permission_camera_read),
        ) {
            val mode = runCatching { ReadMode.valueOf(initialMode) }.getOrDefault(ReadMode.TEXT)
            ReadCameraContent(nav, mode, hint)
        }
    }
}

fun framingText(h: FramingHint): Int = when (h) {
    FramingHint.NO_TEXT -> R.string.framing_no_text
    FramingHint.MOVE_LEFT -> R.string.framing_left
    FramingHint.MOVE_RIGHT -> R.string.framing_right
    FramingHint.MOVE_UP -> R.string.framing_up
    FramingHint.MOVE_DOWN -> R.string.framing_down
    FramingHint.MOVE_CLOSER -> R.string.framing_closer
    FramingHint.MOVE_AWAY -> R.string.framing_away
    FramingHint.GOOD -> R.string.framing_good
}

@Composable
private fun ReadCameraContent(nav: NavHostController, initialMode: ReadMode, defaultHint: String) {
    val context = LocalContext.current
    val container = appContainer()
    val vm = lerguieViewModel { ReadViewModel(it, initialMode) }
    val state by vm.state.collectAsStateWithLifecycle()
    val settings by container.settings.settings.collectAsStateWithLifecycle(AppSettings())
    val controller = rememberCameraController()
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) { vm.resultReady.collect { nav.navigate(Routes.READ_RESULT) } }
    LaunchedEffect(state.torch) { controller.enableTorch(state.torch) }
    LaunchedEffect(settings.readingGuidance, state.mode) {
        if (settings.readingGuidance && state.mode != ReadMode.BARCODE) {
            controller.setImageAnalysisAnalyzer(ContextCompat.getMainExecutor(context)) { proxy ->
                vm.onFrame(proxy) { h -> container.speaker.speak(context.getString(framingText(h)), "framing") }
            }
        } else {
            controller.clearImageAnalysisAnalyzer()
        }
    }

    val gallery = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        uri?.let { Bitmaps.decode(context, it, 2400) }?.let { vm.capture(it) }
    }

    val modes = listOf(
        ModeOption(ReadMode.TEXT, stringResource(R.string.mode_text), Icons.Filled.Description),
        ModeOption(ReadMode.BOOK, stringResource(R.string.mode_book), Icons.AutoMirrored.Filled.MenuBook),
        ModeOption(ReadMode.DOCUMENT, stringResource(R.string.mode_document), Icons.Filled.Article),
        ModeOption(ReadMode.PACKAGE, stringResource(R.string.mode_package), Icons.Filled.Inventory2),
        ModeOption(ReadMode.BARCODE, stringResource(R.string.mode_barcode), Icons.Filled.QrCodeScanner),
    )
    val modeHint = when (state.mode) {
        ReadMode.BARCODE -> stringResource(R.string.read_hint_barcode)
        else -> state.hint?.let { stringResource(framingText(it)) } ?: defaultHint
    }

    Column(Modifier.fillMaxSize().navigationBarsPadding()) {
        Box(
            Modifier.weight(1f).fillMaxWidth().padding(12.dp).clip(RoundedCornerShape(24.dp)).background(Color.Black),
        ) {
            CameraPreview(controller, Modifier.fillMaxSize())
            FrameCorners()
            val tapLabel = stringResource(R.string.tap_to_read)
            Box(
                Modifier.fillMaxSize().clickable(onClickLabel = tapLabel) {
                    scope.launch {
                        runCatching { controller.capture(context, maxSide = 2400) }.onSuccess { vm.capture(it) }.onFailure { vm.captureFailed() }
                    }
                }.semantics { contentDescription = tapLabel },
            )
            CameraHint(modeHint, Modifier.align(Alignment.BottomCenter).padding(12.dp))
            if (state.busy) {
                Surface(Modifier.align(Alignment.Center), color = MaterialTheme.colorScheme.background.copy(alpha = 0.9f), shape = RoundedCornerShape(24.dp)) {
                    BusyIndicator(stringResource(R.string.reading))
                }
            }
        }
        if (state.error) InfoBanner(stringResource(R.string.error_capture), Modifier.padding(horizontal = 16.dp), warning = true)
        ModeSelector(modes, state.mode, onSelect = vm::setMode)
        ToggleRow(
            title = stringResource(R.string.reading_guidance),
            subtitle = stringResource(R.string.reading_guidance_desc),
            checked = settings.readingGuidance,
            onChange = { on -> scope.launch { container.settings.update { it.copy(readingGuidance = on) } } },
        )
        CameraControls(
            captureLabel = stringResource(R.string.capture),
            torchOn = state.torch,
            enabled = !state.busy,
            onGallery = { gallery.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) },
            onCapture = {
                scope.launch {
                    runCatching { controller.capture(context, maxSide = 2400) }
                        .onSuccess { vm.capture(it) }
                        .onFailure { vm.captureFailed() }
                }
            },
            onTorch = { vm.setTorch(!state.torch) },
        )
    }
}
