package com.leuname.lerguie.core.settings

enum class UsageType { BLIND_LOW_VISION, DEAF_NONSPEAKING, DEAF_SPEAKING, HEARING }

enum class DisplayPreference { TEXT, LIBRAS, BOTH }

enum class ThemeMode { LIGHT, DARK, SYSTEM }

data class AppSettings(
    val profileName: String = "",
    val usageType: UsageType = UsageType.BLIND_LOW_VISION,
    val displayPreference: DisplayPreference = DisplayPreference.TEXT,
    val textScale: Float = 1f,
    val largeButtons: Boolean = true,
    val highContrast: Boolean = false,
    val themeMode: ThemeMode = ThemeMode.DARK,
    val vibration: Boolean = true,
    val autoRead: Boolean = true,
    /** Desligado por padrão: repetir a voz da outra pessoa confunde e é inútil para quem é surdo. */
    val speakReplies: Boolean = false,
    val readingGuidance: Boolean = true,
    val speechRate: Float = 1f,
    val speechPitch: Float = 1f,
    /** Vazio = automática (a mais natural disponível). */
    val voiceName: String = "",
    val autoDescribeIntervalSec: Int = 5,
    val useCloudAi: Boolean = true,
    val saveHistory: Boolean = false,
) {
    companion object {
        const val MIN_TEXT_SCALE = 0.8f
        const val MAX_TEXT_SCALE = 2f
        val AUTO_INTERVALS = listOf(3, 5, 10, 20)
    }
}
