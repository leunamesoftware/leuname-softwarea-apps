package com.leuname.lerguie.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.leuname.lerguie.R
import com.leuname.lerguie.ui.theme.LocalBrand
import com.leuname.lerguie.ui.theme.LocalUiPrefs

enum class ButtonKind { PRIMARY, SECONDARY, TONAL }

/** Botão grande, com ícone e texto, pensado para toque fácil e TalkBack. */
@Composable
fun BigButton(
    text: String,
    icon: ImageVector?,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    kind: ButtonKind = ButtonKind.SECONDARY,
    enabled: Boolean = true,
    vertical: Boolean = false,
    accessibilityLabel: String? = null,
) {
    val brand = LocalBrand.current
    val scheme = MaterialTheme.colorScheme
    val shape = RoundedCornerShape(18.dp)
    val (bg, fg) = when (kind) {
        ButtonKind.PRIMARY -> Brush.horizontalGradient(brand.actionGradient) to
            (if (brand.highContrast) Color.Black else Color.White)
        ButtonKind.SECONDARY -> Brush.linearGradient(listOf(scheme.primaryContainer, scheme.primaryContainer)) to scheme.onPrimaryContainer
        ButtonKind.TONAL -> Brush.linearGradient(listOf(scheme.surfaceVariant, scheme.surfaceVariant)) to scheme.onSurfaceVariant
    }
    val content: @Composable () -> Unit = {
        if (icon != null) Icon(icon, contentDescription = null, tint = fg, modifier = Modifier.size(if (vertical) 30.dp else 28.dp))
        if (vertical) Spacer(Modifier.size(4.dp)) else Spacer(Modifier.width(10.dp))
        Text(
            text, color = fg, textAlign = TextAlign.Center,
            style = if (kind == ButtonKind.PRIMARY) MaterialTheme.typography.titleMedium else MaterialTheme.typography.labelLarge,
        )
    }
    Box(
        modifier = modifier
            .defaultMinSize(minHeight = LocalUiPrefs.current.buttonHeight)
            .clip(shape)
            .background(bg, shape)
            .then(if (brand.highContrast) Modifier.border(2.dp, Color.White, shape) else Modifier)
            .clickable(enabled = enabled, role = Role.Button, onClick = onClick)
            .semantics { if (accessibilityLabel != null) contentDescription = accessibilityLabel }
            .padding(horizontal = 12.dp, vertical = 10.dp),
        contentAlignment = Alignment.Center,
    ) {
        if (vertical) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) { content() }
        } else {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Center) { content() }
        }
    }
}

/** Botão redondo "ouvir" (ou "parar" enquanto fala). */
@Composable
fun SpeakButton(label: String, speaking: Boolean, onSpeak: () -> Unit, onStop: () -> Unit, strong: Boolean = false) {
    val scheme = MaterialTheme.colorScheme
    val bg = if (strong) scheme.primary else scheme.primaryContainer
    val fg = if (strong) scheme.onPrimary else scheme.onPrimaryContainer
    val desc = if (speaking) stringResource(R.string.stop_reading) else stringResource(R.string.listen_to, label)
    Box(
        modifier = Modifier
            .size(LocalUiPrefs.current.iconButtonSize)
            .clip(CircleShape)
            .background(bg)
            .clickable(role = Role.Button, onClick = if (speaking) onStop else onSpeak)
            .semantics { contentDescription = desc },
        contentAlignment = Alignment.Center,
    ) {
        Icon(if (speaking) Icons.Filled.Stop else Icons.AutoMirrored.Filled.VolumeUp, contentDescription = null, tint = fg)
    }
}
