package com.leuname.lerguie.core.settings

enum class UsageType { BLIND_LOW_VISION, DEAF_NONSPEAKING, DEAF_SPEAKING, CANNOT_READ, HEARING }

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
    /** Primeira escolha de perfil já feita. */
    val onboarded: Boolean = false,
    /** Fala o nome do botão ao tocar (para quem não lê). */
    val announceButtons: Boolean = false,
) {
    /** Quem precisa ouvir tudo (não enxerga ou não lê). */
    val voiceFirst: Boolean get() = usageType == UsageType.BLIND_LOW_VISION || usageType == UsageType.CANNOT_READ
    val deaf: Boolean get() = usageType == UsageType.DEAF_NONSPEAKING || usageType == UsageType.DEAF_SPEAKING

    /** Ajustes recomendados para cada perfil (a pessoa pode mudar depois em Ajustes). */
    fun withProfile(u: UsageType): AppSettings = when (u) {
        UsageType.BLIND_LOW_VISION -> copy(usageType = u, autoRead = true, speakReplies = true, readingGuidance = true,
            largeButtons = true, vibration = true, announceButtons = false, displayPreference = DisplayPreference.TEXT)
        UsageType.CANNOT_READ -> copy(usageType = u, autoRead = true, speakReplies = true, readingGuidance = false,
            largeButtons = true, announceButtons = true, displayPreference = DisplayPreference.TEXT)
        UsageType.DEAF_NONSPEAKING -> copy(usageType = u, autoRead = false, speakReplies = false, vibration = true,
            announceButtons = false, textScale = maxOf(textScale, 1.2f), displayPreference = DisplayPreference.BOTH)
        UsageType.DEAF_SPEAKING -> copy(usageType = u, autoRead = false, speakReplies = false, vibration = true,
            announceButtons = false, textScale = maxOf(textScale, 1.2f))
        UsageType.HEARING -> copy(usageType = u, announceButtons = false)
    }.copy(onboarded = true)

    companion object {
        const val MIN_TEXT_SCALE = 0.8f
        const val MAX_TEXT_SCALE = 2f
        val AUTO_INTERVALS = listOf(3, 5, 10, 20)
    }
}
