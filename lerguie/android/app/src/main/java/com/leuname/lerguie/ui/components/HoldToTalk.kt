package com.leuname.lerguie.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MicNone
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.onClick
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.unit.dp
import com.leuname.lerguie.ui.theme.LocalBrand

/**
 * Botão "segure para falar": ouve SÓ enquanto está pressionado e para ao soltar
 * (nada fica ligado sozinho). Com TalkBack: toque duplo liga, outro toque duplo para.
 */
@Composable
fun HoldToTalkButton(
    label: String,
    listeningLabel: String,
    listening: Boolean,
    level: Float,
    onStart: () -> Unit,
    onStop: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val brand = LocalBrand.current
    val start by rememberUpdatedState(onStart)
    val stop by rememberUpdatedState(onStop)
    val isListening by rememberUpdatedState(listening)
    val shape = RoundedCornerShape(24.dp)
    val fg = if (brand.highContrast) Color.Black else Color.White
    Row(
        modifier = modifier
            .heightIn(min = 88.dp)
            .clip(shape)
            .background(Brush.horizontalGradient(brand.actionGradient), shape)
            .border(if (listening) 4.dp + 8.dp * level else 0.dp, Color.White.copy(alpha = 0.8f), shape)
            .pointerInput(Unit) {
                detectTapGestures(onPress = {
                    start()
                    tryAwaitRelease()
                    stop()
                })
            }
            .semantics(mergeDescendants = true) {
                role = Role.Button
                contentDescription = label
                stateDescription = if (listening) listeningLabel else ""
                liveRegion = LiveRegionMode.Polite
                onClick { if (isListening) stop() else start(); true }
            }
            .padding(horizontal = 20.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center,
    ) {
        Icon(if (listening) Icons.Filled.Mic else Icons.Filled.MicNone, null, tint = fg, modifier = Modifier.size(40.dp))
        Spacer(Modifier.width(12.dp))
        Text(if (listening) listeningLabel else label, color = fg, style = MaterialTheme.typography.titleLarge)
    }
}
