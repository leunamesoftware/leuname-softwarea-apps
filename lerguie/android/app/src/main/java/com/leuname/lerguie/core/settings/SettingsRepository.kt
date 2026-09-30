package com.leuname.lerguie.core.settings

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "settings")

/** Preferências locais do usuário (DataStore). Nada disso sai do aparelho. */
class SettingsRepository(private val context: Context) {

    private object Keys {
        val profileName = stringPreferencesKey("profile_name")
        val usageType = stringPreferencesKey("usage_type")
        val display = stringPreferencesKey("display_preference")
        val textScale = floatPreferencesKey("text_scale")
        val largeButtons = booleanPreferencesKey("large_buttons")
        val highContrast = booleanPreferencesKey("high_contrast")
        val theme = stringPreferencesKey("theme_mode")
        val vibration = booleanPreferencesKey("vibration")
        val autoRead = booleanPreferencesKey("auto_read")
        val speakReplies = booleanPreferencesKey("speak_replies")
        val readingGuidance = booleanPreferencesKey("reading_guidance")
        val speechRate = floatPreferencesKey("speech_rate")
        val speechPitch = floatPreferencesKey("speech_pitch")
        val autoInterval = intPreferencesKey("auto_interval")
        val useCloudAi = booleanPreferencesKey("use_cloud_ai")
        val saveHistory = booleanPreferencesKey("save_history")
    }

    val settings: Flow<AppSettings> = context.dataStore.data.map { fromPrefs(it) }

    private fun fromPrefs(p: Preferences): AppSettings {
        val d = AppSettings()
        return AppSettings(
            profileName = p[Keys.profileName] ?: d.profileName,
            usageType = enumOr(p[Keys.usageType], d.usageType),
            displayPreference = enumOr(p[Keys.display], d.displayPreference),
            textScale = (p[Keys.textScale] ?: d.textScale)
                .coerceIn(AppSettings.MIN_TEXT_SCALE, AppSettings.MAX_TEXT_SCALE),
            largeButtons = p[Keys.largeButtons] ?: d.largeButtons,
            highContrast = p[Keys.highContrast] ?: d.highContrast,
            themeMode = enumOr(p[Keys.theme], d.themeMode),
            vibration = p[Keys.vibration] ?: d.vibration,
            autoRead = p[Keys.autoRead] ?: d.autoRead,
            speakReplies = p[Keys.speakReplies] ?: d.speakReplies,
            readingGuidance = p[Keys.readingGuidance] ?: d.readingGuidance,
            speechRate = (p[Keys.speechRate] ?: d.speechRate).coerceIn(0.5f, 2f),
            speechPitch = (p[Keys.speechPitch] ?: d.speechPitch).coerceIn(0.5f, 2f),
            autoDescribeIntervalSec = p[Keys.autoInterval] ?: d.autoDescribeIntervalSec,
            useCloudAi = p[Keys.useCloudAi] ?: d.useCloudAi,
            saveHistory = p[Keys.saveHistory] ?: d.saveHistory,
        )
    }

    suspend fun current(): AppSettings = settings.first()

    suspend fun update(transform: (AppSettings) -> AppSettings) {
        context.dataStore.edit { p ->
            val s = transform(fromPrefs(p))
            p[Keys.profileName] = s.profileName.take(60)
            p[Keys.usageType] = s.usageType.name
            p[Keys.display] = s.displayPreference.name
            p[Keys.textScale] = s.textScale
            p[Keys.largeButtons] = s.largeButtons
            p[Keys.highContrast] = s.highContrast
            p[Keys.theme] = s.themeMode.name
            p[Keys.vibration] = s.vibration
            p[Keys.autoRead] = s.autoRead
            p[Keys.speakReplies] = s.speakReplies
            p[Keys.readingGuidance] = s.readingGuidance
            p[Keys.speechRate] = s.speechRate
            p[Keys.speechPitch] = s.speechPitch
            p[Keys.autoInterval] = s.autoDescribeIntervalSec
            p[Keys.useCloudAi] = s.useCloudAi
            p[Keys.saveHistory] = s.saveHistory
        }
    }

    private inline fun <reified E : Enum<E>> enumOr(value: String?, default: E): E =
        value?.let { runCatching { enumValueOf<E>(it) }.getOrNull() } ?: default
}
