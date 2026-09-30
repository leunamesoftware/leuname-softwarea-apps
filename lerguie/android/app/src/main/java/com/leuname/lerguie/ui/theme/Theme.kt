package com.leuname.lerguie.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.isSpecified
import com.leuname.lerguie.core.settings.AppSettings
import com.leuname.lerguie.core.settings.ThemeMode

object Palette {
    val Night = Color(0xFF12053A)
    val Deep = Color(0xFF1E0255)
    val Purple = Color(0xFF5B12D6)
    val Violet = Color(0xFF8B3DFF)
    val Orange = Color(0xFFFF7A00)
    val OrangeDeep = Color(0xFFD94E00)
    val Pink = Color(0xFFF0206B)
    val PinkDeep = Color(0xFFB0124F)
    val Blue = Color(0xFF1E90FF)
    val BlueDeep = Color(0xFF0A4FD6)
    val Success = Color(0xFF1B8F41)
    val Lilac = Color(0xFFEEE6FF)
    val Ink = Color(0xFF1B0A4A)
    val Highlight = Color(0xFFFFE45C)
}

@Immutable
data class Brand(
    val header: Color,
    val onHeader: Color,
    val accent: Color,
    val seeGradient: List<Color>,
    val readGradient: List<Color>,
    val listenGradient: List<Color>,
    val communicateGradient: List<Color>,
    val actionGradient: List<Color>,
    val onGradient: Color,
    val highContrast: Boolean,
)

@Immutable
data class UiPrefs(val largeButtons: Boolean = true, val autoRead: Boolean = true) {
    val buttonHeight: Dp get() = if (largeButtons) 64.dp else 52.dp
    val iconButtonSize: Dp get() = if (largeButtons) 56.dp else 48.dp
}

val LocalBrand = staticCompositionLocalOf { brandFor(highContrast = false) }
val LocalUiPrefs = staticCompositionLocalOf { UiPrefs() }

private fun brandFor(highContrast: Boolean): Brand = if (highContrast) {
    val y = Color(0xFFFFD600)
    Brand(
        header = Color.Black, onHeader = Color.White, accent = y,
        seeGradient = listOf(Color.Black, Color.Black), readGradient = listOf(Color.Black, Color.Black),
        listenGradient = listOf(Color.Black, Color.Black), communicateGradient = listOf(Color.Black, Color.Black),
        actionGradient = listOf(y, y), onGradient = Color.White, highContrast = true,
    )
} else Brand(
    header = Palette.Deep, onHeader = Color.White, accent = Palette.Orange,
    seeGradient = listOf(Palette.Violet, Palette.Purple),
    readGradient = listOf(Palette.Orange, Palette.OrangeDeep),
    listenGradient = listOf(Palette.Blue, Palette.BlueDeep),
    communicateGradient = listOf(Palette.Pink, Palette.PinkDeep),
    actionGradient = listOf(Palette.Orange, Palette.OrangeDeep),
    onGradient = Color.White, highContrast = false,
)

private val DarkScheme = darkColorScheme(
    primary = Color(0xFFB794FF), onPrimary = Palette.Ink,
    primaryContainer = Palette.Purple, onPrimaryContainer = Color.White,
    secondary = Palette.Orange, onSecondary = Palette.Ink,
    background = Palette.Night, onBackground = Color.White,
    surface = Color(0xFF221058), onSurface = Color.White,
    surfaceVariant = Color(0xFF2E1870), onSurfaceVariant = Color(0xFFE3D9FF),
    surfaceContainer = Color(0xFF2A1466), surfaceContainerHigh = Color(0xFF33197A),
    outline = Color(0xFF8C7AC8), error = Color(0xFFFF8A80), onError = Palette.Ink,
)

private val LightScheme = lightColorScheme(
    primary = Palette.Purple, onPrimary = Color.White,
    primaryContainer = Palette.Lilac, onPrimaryContainer = Palette.Ink,
    secondary = Palette.OrangeDeep, onSecondary = Color.White,
    background = Color(0xFFF3EEFF), onBackground = Palette.Ink,
    surface = Color.White, onSurface = Palette.Ink,
    surfaceVariant = Palette.Lilac, onSurfaceVariant = Color(0xFF3D2C6E),
    surfaceContainer = Color(0xFFF7F3FF), surfaceContainerHigh = Color(0xFFEDE5FF),
    outline = Color(0xFF7A6AA8), error = Color(0xFFB3261E), onError = Color.White,
)

private val HighContrastScheme = darkColorScheme(
    primary = Color(0xFFFFD600), onPrimary = Color.Black,
    primaryContainer = Color(0xFFFFD600), onPrimaryContainer = Color.Black,
    secondary = Color(0xFFFFD600), onSecondary = Color.Black,
    background = Color.Black, onBackground = Color.White,
    surface = Color.Black, onSurface = Color.White,
    surfaceVariant = Color(0xFF1A1A1A), onSurfaceVariant = Color.White,
    surfaceContainer = Color(0xFF111111), surfaceContainerHigh = Color(0xFF1A1A1A),
    outline = Color.White, error = Color(0xFFFF6E6E), onError = Color.Black,
)

private fun scaled(style: TextStyle, f: Float) = style.copy(
    fontSize = if (style.fontSize.isSpecified) style.fontSize * f else style.fontSize,
    lineHeight = if (style.lineHeight.isSpecified) style.lineHeight * f else style.lineHeight,
)

private fun typography(scale: Float): Typography {
    val b = Typography()
    return Typography(
        displayLarge = scaled(b.displayLarge, scale), displayMedium = scaled(b.displayMedium, scale),
        displaySmall = scaled(b.displaySmall, scale),
        headlineLarge = scaled(b.headlineLarge.copy(fontWeight = FontWeight.Bold), scale),
        headlineMedium = scaled(b.headlineMedium.copy(fontWeight = FontWeight.Bold), scale),
        headlineSmall = scaled(b.headlineSmall.copy(fontWeight = FontWeight.Bold), scale),
        titleLarge = scaled(b.titleLarge.copy(fontWeight = FontWeight.Bold), scale),
        titleMedium = scaled(b.titleMedium.copy(fontWeight = FontWeight.SemiBold), scale),
        titleSmall = scaled(b.titleSmall, scale),
        bodyLarge = scaled(b.bodyLarge, scale), bodyMedium = scaled(b.bodyMedium, scale),
        bodySmall = scaled(b.bodySmall, scale),
        labelLarge = scaled(b.labelLarge.copy(fontWeight = FontWeight.SemiBold), scale),
        labelMedium = scaled(b.labelMedium, scale), labelSmall = scaled(b.labelSmall, scale),
    )
}

@Composable
fun LerguieTheme(settings: AppSettings, content: @Composable () -> Unit) {
    val dark = when (settings.themeMode) {
        ThemeMode.DARK -> true
        ThemeMode.LIGHT -> false
        ThemeMode.SYSTEM -> isSystemInDarkTheme()
    }
    val scheme: ColorScheme = when {
        settings.highContrast -> HighContrastScheme
        dark -> DarkScheme
        else -> LightScheme
    }
    CompositionLocalProvider(
        LocalBrand provides brandFor(settings.highContrast),
        LocalUiPrefs provides UiPrefs(settings.largeButtons, settings.autoRead),
    ) {
        MaterialTheme(colorScheme = scheme, typography = typography(settings.textScale), content = content)
    }
}
