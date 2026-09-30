package com.leuname.lerguie.ui.memory

import android.Manifest
import android.graphics.Bitmap
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.filled.School
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import com.leuname.lerguie.R
import com.leuname.lerguie.core.haptics.HapticEvent
import com.leuname.lerguie.data.db.KnownObjectWithCount
import com.leuname.lerguie.ui.appContainer
import com.leuname.lerguie.ui.components.BigButton
import com.leuname.lerguie.ui.components.BusyIndicator
import com.leuname.lerguie.ui.components.ButtonKind
import com.leuname.lerguie.ui.components.CameraPreview
import com.leuname.lerguie.ui.components.FrameCorners
import com.leuname.lerguie.ui.components.InfoBanner
import com.leuname.lerguie.ui.components.LerguieHeader
import com.leuname.lerguie.ui.components.PermissionGate
import com.leuname.lerguie.ui.components.capture
import com.leuname.lerguie.ui.components.rememberCameraController
import com.leuname.lerguie.ui.navigation.Routes
import kotlinx.coroutines.launch

/** Lista dos objetos ensinados, com opção de ensinar novo e excluir. */
@Composable
fun MemoryScreen(nav: NavHostController) {
    val container = appContainer()
    val items by container.memory.observe().collectAsStateWithLifecycle(emptyList())
    val scope = rememberCoroutineScope()
    var toDelete by remember { mutableStateOf<KnownObjectWithCount?>(null) }

    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        LerguieHeader(onBack = { nav.popBackStack() })
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(stringResource(R.string.memory_title), style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.semantics { heading() })
            InfoBanner(stringResource(R.string.memory_explain), icon = Icons.Filled.School)
            BigButton(stringResource(R.string.memory_teach_new), Icons.Filled.Add, { nav.navigate(Routes.TEACH) },
                Modifier.fillMaxWidth(), ButtonKind.PRIMARY)
            if (items.isEmpty()) {
                Text(stringResource(R.string.memory_empty), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground)
            }
        }
        LazyColumn(contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(items, key = { it.id }) { o ->
                Surface(shape = RoundedCornerShape(18.dp), color = MaterialTheme.colorScheme.surface, modifier = Modifier.fillMaxWidth()) {
                    Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.School, null, tint = MaterialTheme.colorScheme.secondary, modifier = Modifier.size(32.dp))
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f).semantics(mergeDescendants = true) {}) {
                            Text(o.name, style = MaterialTheme.typography.titleMedium)
                            Text(stringResource(R.string.memory_samples, o.samples), style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        IconButton(onClick = { toDelete = o }, modifier = Modifier.size(56.dp)) {
                            Icon(Icons.Filled.Delete, stringResource(R.string.memory_delete, o.name))
                        }
                    }
                }
            }
        }
    }

    toDelete?.let { o ->
        AlertDialog(
            onDismissRequest = { toDelete = null },
            title = { Text(stringResource(R.string.memory_delete, o.name)) },
            confirmButton = { TextButton(onClick = { scope.launch { container.memory.delete(o.id) }; toDelete = null }) { Text(stringResource(R.string.delete)) } },
            dismissButton = { TextButton(onClick = { toDelete = null }) { Text(stringResource(R.string.cancel)) } },
        )
    }
}

private const val MAX_PHOTOS = 3

/** Ensinar: nome + até 3 fotos de ângulos diferentes. Feito por quem enxerga (ajudante/familiar). */
@Composable
fun TeachScreen(nav: NavHostController) {
    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        LerguieHeader(onBack = { nav.popBackStack() })
        PermissionGate(
            permission = Manifest.permission.CAMERA,
            title = stringResource(R.string.permission_camera_title),
            reason = stringResource(R.string.permission_camera_teach),
        ) { TeachContent(nav) }
    }
}

@Composable
private fun TeachContent(nav: NavHostController) {
    val context = LocalContext.current
    val container = appContainer()
    val controller = rememberCameraController()
    val scope = rememberCoroutineScope()
    var name by rememberSaveable { mutableStateOf("") }
    val photos = remember { mutableStateListOf<Bitmap>() }
    var busy by remember { mutableStateOf(false) }
    var failed by remember { mutableStateOf(false) }
    val savedMsg = stringResource(R.string.memory_saved)

    Column(Modifier.fillMaxSize().navigationBarsPadding().padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Box(Modifier.weight(1f).fillMaxWidth().clip(RoundedCornerShape(24.dp)).background(Color.Black)) {
            CameraPreview(controller, Modifier.fillMaxSize())
            FrameCorners()
            if (busy) {
                Surface(Modifier.align(Alignment.Center), color = MaterialTheme.colorScheme.background.copy(alpha = 0.9f), shape = RoundedCornerShape(24.dp)) {
                    BusyIndicator(stringResource(R.string.memory_saving))
                }
            }
        }
        Text(stringResource(R.string.memory_teach_tip), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onBackground)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            photos.forEach { p ->
                Image(p.asImageBitmap(), null, contentScale = ContentScale.Crop, modifier = Modifier.size(64.dp).clip(RoundedCornerShape(12.dp)))
            }
        }
        OutlinedTextField(
            value = name, onValueChange = { name = it.take(80) }, singleLine = true,
            label = { Text(stringResource(R.string.memory_name_label)) },
            modifier = Modifier.fillMaxWidth(),
        )
        if (failed) InfoBanner(stringResource(R.string.memory_failed), warning = true)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            BigButton(
                stringResource(R.string.memory_photo_n, photos.size + 1, MAX_PHOTOS), Icons.Filled.CameraAlt,
                {
                    scope.launch {
                        runCatching { controller.capture(context, maxSide = 800) }.onSuccess {
                            photos.add(it)
                            container.haptics.play(HapticEvent.CAPTURE)
                        }
                    }
                },
                Modifier.weight(1f), ButtonKind.TONAL, enabled = photos.size < MAX_PHOTOS && !busy,
            )
            BigButton(
                stringResource(R.string.save), Icons.Filled.Save,
                {
                    busy = true
                    failed = false
                    scope.launch {
                        val ok = container.memory.teach(name, photos.toList())
                        busy = false
                        if (ok) {
                            container.haptics.play(HapticEvent.SUCCESS)
                            container.speaker.speak(savedMsg.format(name.trim()))
                            nav.popBackStack()
                        } else {
                            failed = true
                            container.haptics.play(HapticEvent.ERROR)
                        }
                    }
                },
                Modifier.weight(1f), ButtonKind.PRIMARY, enabled = name.isNotBlank() && photos.isNotEmpty() && !busy,
            )
        }
    }
}
