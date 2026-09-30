package com.leuname.lerguie.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.leuname.lerguie.ui.theme.LocalBrand

/** Botão grande de microfone; o anel cresce com o volume captado (indica que está ouvindo). */
@Composable
fun MicButton(listening: Boolean, level: Float, label: String, onClick: () -> Unit, size: Dp = 140.dp) {
    val brand = LocalBrand.current
    val ring = if (listening) 4.dp + (12.dp * level) else 4.dp
    Box(
        Modifier
            .size(size)
            .clip(CircleShape)
            .border(ring, if (listening) brand.accent.copy(alpha = 0.6f) else Color.White.copy(alpha = 0.5f), CircleShape)
            .background(Brush.linearGradient(brand.actionGradient))
            .clickable(role = Role.Button, onClick = onClick)
            .semantics { contentDescription = label },
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            if (listening) Icons.Filled.Stop else Icons.Filled.Mic, contentDescription = null,
            tint = if (brand.highContrast) Color.Black else Color.White, modifier = Modifier.size(size * 0.45f),
        )
    }
}
