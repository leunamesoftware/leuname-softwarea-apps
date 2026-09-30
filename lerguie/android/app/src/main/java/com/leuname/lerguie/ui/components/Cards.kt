package com.leuname.lerguie.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.leuname.lerguie.ui.theme.LocalAnnouncer
import com.leuname.lerguie.ui.theme.LocalBrand
import com.leuname.lerguie.ui.theme.Palette

/** Cartão grande da tela inicial (Ver, Ler, Ouvir, Comunicar). */
@Composable
fun FeatureCard(
    title: String,
    subtitle: String,
    icon: ImageVector,
    gradient: List<Color>,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val brand = LocalBrand.current
    val shape = RoundedCornerShape(24.dp)
    val announce = LocalAnnouncer.current
    Box(
        modifier = modifier
            .heightIn(min = 170.dp)
            .clip(shape)
            .background(Brush.linearGradient(gradient), shape)
            .then(if (brand.highContrast) Modifier.border(3.dp, brand.accent, shape) else Modifier)
            .clickable(role = Role.Button, onClick = { announce(title); onClick() })
            .semantics(mergeDescendants = true) { contentDescription = "$title. $subtitle" }
            .padding(16.dp),
    ) {
        Column(Modifier.fillMaxWidth()) {
            Icon(icon, contentDescription = null, tint = brand.onGradient, modifier = Modifier.size(52.dp))
            Spacer(Modifier.height(16.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    title, color = brand.onGradient, style = MaterialTheme.typography.headlineSmall,
                    modifier = Modifier.weight(1f),
                )
                Box(
                    Modifier.size(36.dp).clip(CircleShape).background(Color.Black.copy(alpha = 0.25f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null, tint = brand.onGradient)
                }
            }
            Text(subtitle, color = brand.onGradient, style = MaterialTheme.typography.bodyLarge)
        }
    }
}

/** Seção de resultado: ícone, título, texto e botão de ouvir. */
@Composable
fun ResultSection(
    icon: ImageVector,
    iconTint: Color,
    title: String,
    body: String,
    modifier: Modifier = Modifier,
    highlighted: Boolean = false,
    trailing: @Composable () -> Unit = {},
) {
    val scheme = MaterialTheme.colorScheme
    val brand = LocalBrand.current
    val bg = when {
        brand.highContrast -> scheme.surface
        highlighted -> if (scheme.surface.luminance() > 0.5f) Color(0xFFE6F6EA) else Color(0xFF123D25)
        else -> scheme.surface
    }
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        color = bg,
        border = if (brand.highContrast) androidx.compose.foundation.BorderStroke(2.dp, Color.White) else null,
        shadowElevation = 1.dp,
    ) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = null, tint = iconTint, modifier = Modifier.size(36.dp))
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f).semantics(mergeDescendants = true) {}) {
                Text(title, style = MaterialTheme.typography.titleMedium, color = scheme.onSurface)
                Text(body, style = MaterialTheme.typography.bodyLarge, color = scheme.onSurface)
            }
            Spacer(Modifier.width(8.dp))
            trailing()
        }
    }
}

private fun Color.luminance(): Float = 0.2126f * red + 0.7152f * green + 0.0722f * blue

/** Aviso informativo (anunciado pelo TalkBack quando muda). */
@Composable
fun InfoBanner(text: String, modifier: Modifier = Modifier, icon: ImageVector = Icons.Filled.Info, warning: Boolean = false) {
    val scheme = MaterialTheme.colorScheme
    Surface(
        modifier = modifier.fillMaxWidth().semantics { liveRegion = LiveRegionMode.Polite },
        shape = RoundedCornerShape(16.dp),
        color = if (warning) scheme.errorContainer else scheme.primaryContainer,
    ) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = null, tint = if (warning) scheme.onErrorContainer else Palette.Violet)
            Spacer(Modifier.width(12.dp))
            Text(text, style = MaterialTheme.typography.bodyLarge, color = if (warning) scheme.onErrorContainer else scheme.onPrimaryContainer)
        }
    }
}

@Composable
fun BusyIndicator(text: String, modifier: Modifier = Modifier) {
    Column(
        modifier.padding(24.dp).semantics(mergeDescendants = true) { liveRegion = LiveRegionMode.Assertive },
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        CircularProgressIndicator(modifier = Modifier.size(56.dp), strokeWidth = 5.dp, color = LocalBrand.current.accent)
        Text(text, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground)
    }
}
