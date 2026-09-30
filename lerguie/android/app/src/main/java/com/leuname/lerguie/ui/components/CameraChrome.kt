package com.leuname.lerguie.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FlashlightOff
import androidx.compose.material.icons.filled.FlashlightOn
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.leuname.lerguie.R
import com.leuname.lerguie.ui.theme.LocalBrand

/** Cantos de enquadramento sobre a câmera (decorativo). */
@Composable
fun FrameCorners(modifier: Modifier = Modifier) {
    Canvas(modifier.fillMaxSize().padding(48.dp)) {
        val len = size.minDimension * 0.18f
        val stroke = 10f
        val c = Color.White
        fun corner(o: Offset, dx: Float, dy: Float) {
            drawLine(c, o, o + Offset(dx, 0f), stroke, StrokeCap.Round)
            drawLine(c, o, o + Offset(0f, dy), stroke, StrokeCap.Round)
        }
        corner(Offset(0f, 0f), len, len)
        corner(Offset(size.width, 0f), -len, len)
        corner(Offset(0f, size.height), len, -len)
        corner(Offset(size.width, size.height), -len, -len)
    }
}

/** Dica sobre a câmera; o TalkBack anuncia quando muda. */
@Composable
fun CameraHint(text: String, modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier.semantics { liveRegion = LiveRegionMode.Polite },
        color = Color.Black.copy(alpha = 0.65f),
        shape = RoundedCornerShape(16.dp),
    ) {
        Text(text, color = Color.White, style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(14.dp))
    }
}

/** Barra inferior da câmera: Galeria, botão grande de captura e Lanterna. */
@Composable
fun CameraControls(
    captureLabel: String,
    torchOn: Boolean,
    enabled: Boolean,
    onGallery: () -> Unit,
    onCapture: () -> Unit,
    onTorch: () -> Unit,
) {
    val brand = LocalBrand.current
    Row(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        BigButton(stringResource(R.string.gallery), Icons.Filled.PhotoLibrary, onGallery, Modifier.size(width = 100.dp, height = 88.dp), ButtonKind.TONAL, vertical = true)
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Box(
                Modifier
                    .size(96.dp)
                    .clip(CircleShape)
                    .border(BorderStroke(5.dp, Color.White), CircleShape)
                    .padding(8.dp)
                    .clip(CircleShape)
                    .background(Brush.linearGradient(brand.actionGradient))
                    .clickable(enabled = enabled, role = Role.Button, onClick = onCapture)
                    .semantics { contentDescription = captureLabel },
            )
            Text(captureLabel, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground)
        }
        BigButton(
            stringResource(if (torchOn) R.string.torch_off else R.string.torch_on),
            if (torchOn) Icons.Filled.FlashlightOff else Icons.Filled.FlashlightOn,
            onTorch, Modifier.size(width = 100.dp, height = 88.dp), ButtonKind.TONAL, vertical = true,
        )
    }
}
