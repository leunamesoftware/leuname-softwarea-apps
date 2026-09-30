package com.leuname.lerguie.ui.see

import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.DirectionsWalk
import androidx.compose.material.icons.automirrored.filled.HelpOutline
import androidx.compose.material.icons.filled.Category
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Landscape
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.School
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
import com.leuname.lerguie.ai.vision.VisionMode
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

private const val MODE_TEXT = "text"
private const val MODE_BARCODE = "barcode"

@Composable
fun SeeScreen(nav: NavHostController, find: String = "") {
    val container = appContainer()
    val hint = stringResource(R.string.see_hint)
    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        LerguieHeader(onBack = { nav.popBackStack() }) {
            HeaderAction(Icons.Filled.School, stringResource(R.string.memory_title)) { nav.navigate(Routes.MEMORY) }
            HeaderAction(Icons.AutoMirrored.Filled.HelpOutline, stringResource(R.string.help)) { container.speaker.speak(hint) }
        }
        PermissionGate(
            permission = Manifest.permission.CAMERA,
            title = stringResource(R.string.permission_camera_title),
            reason = stringResource(R.string.permission_camera_see),
        ) { SeeCameraContent(nav, hint, find) }
    }
}

@Composable
private fun SeeCameraContent(nav: NavHostController, hint: String, find: String) {
    val context = LocalContext.current
    val container = appContainer()
    val vm = lerguieViewModel { SeeViewModel(it) }
    val state by vm.state.collectAsStateWithLifecycle()
    val settings by container.settings.settings.collectAsStateWithLifecycle(AppSettings())
    val controller = rememberCameraController()
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) { vm.resultReady.collect { nav.navigate(Routes.SEE_RESULT) } }
    LaunchedEffect(find) { if (find.isNotBlank()) vm.setFind(find) }
    LaunchedEffect(state.torch) { controller.enableTorch(state.torch) }
    LaunchedEffect(state.continuous, settings.autoDescribeIntervalSec) {
        if (state.continuous) {
            controller.setImageAnalysisAnalyzer(ContextCompat.getMainExecutor(context)) { proxy ->
                vm.onFrame(proxy, settings.autoDescribeIntervalSec)
            }
        } else {
            controller.clearImageAnalysisAnalyzer()
        }
    }

    val gallery = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        uri?.let { Bitmaps.decode(context, it, 1600) }?.let { vm.analyze(it) }
    }

    val modes = listOf(
        ModeOption(VisionMode.WALK.name, stringResource(R.string.mode_walk), Icons.AutoMirrored.Filled.DirectionsWalk),
        ModeOption(VisionMode.OBJECT.name, stringResource(R.string.mode_object), Icons.Filled.Category),
        ModeOption(VisionMode.PERSON.name, stringResource(R.string.mode_person), Icons.Filled.Person),
        ModeOption(VisionMode.ENVIRONMENT.name, stringResource(R.string.mode_environment), Icons.Filled.Landscape),
        ModeOption(MODE_TEXT, stringResource(R.string.mode_text), Icons.Filled.Description),
        ModeOption(MODE_BARCODE, stringResource(R.string.mode_barcode), Icons.Filled.QrCodeScanner),
    )

    Column(Modifier.fillMaxSize().navigationBarsPadding()) {
        Box(
            Modifier
                .weight(1f)
                .fillMaxWidth()
                .padding(12.dp)
                .clip(RoundedCornerShape(24.dp))
                .background(Color.Black),
        ) {
            CameraPreview(controller, Modifier.fillMaxSize())
            FrameCorners()
            // Toque em qualquer lugar da imagem para descrever (o que é, cor e o que está escrito).
            val tapLabel = stringResource(R.string.tap_to_describe)
            Box(
                Modifier.fillMaxSize().clickable(onClickLabel = tapLabel) {
                    scope.launch {
                        runCatching { controller.capture(context) }.onSuccess { vm.analyze(it) }.onFailure { vm.captureFailed() }
                    }
                }.semantics { contentDescription = tapLabel },
            )
            CameraHint(state.lastAuto ?: hint, Modifier.align(Alignment.TopStart).padding(12.dp))
            if (state.busy) {
                Surface(Modifier.align(Alignment.Center), color = MaterialTheme.colorScheme.background.copy(alpha = 0.9f), shape = RoundedCornerShape(24.dp)) {
                    BusyIndicator(stringResource(R.string.analyzing))
                }
            }
        }
        if (state.error) InfoBanner(stringResource(R.string.error_capture), Modifier.padding(horizontal = 16.dp), warning = true)
        ModeSelector(modes, state.mode.name, onSelect = { value ->
            when (value) {
                MODE_TEXT -> nav.navigate(Routes.read("TEXT"))
                MODE_BARCODE -> nav.navigate(Routes.read("BARCODE"))
                else -> vm.setMode(VisionMode.valueOf(value))
            }
        })
        Spacer(Modifier.height(4.dp))
        if (state.find != null && state.mode == VisionMode.WALK) {
            InfoBanner(stringResource(R.string.find_active, state.find!!), Modifier.padding(horizontal = 16.dp))
        } else if (state.mode == VisionMode.WALK) {
            InfoBanner(stringResource(R.string.walk_active), Modifier.padding(horizontal = 16.dp))
        } else {
            ToggleRow(
                title = stringResource(R.string.auto_describe),
                subtitle = stringResource(R.string.auto_describe_desc, settings.autoDescribeIntervalSec),
                checked = state.autoDescribe,
                onChange = vm::setAutoDescribe,
            )
        }
        CameraControls(
            captureLabel = stringResource(R.string.take_photo),
            torchOn = state.torch,
            enabled = !state.busy,
            onGallery = { gallery.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) },
            onCapture = {
                scope.launch {
                    runCatching { controller.capture(context) }
                        .onSuccess { vm.analyze(it) }
                        .onFailure { vm.captureFailed() }
                }
            },
            onTorch = { vm.setTorch(!state.torch) },
        )
    }
}
