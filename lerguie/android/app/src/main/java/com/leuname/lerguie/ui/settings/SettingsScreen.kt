package com.leuname.lerguie.ui.settings

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.speech.tts.TextToSpeech
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.DeleteForever
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Restore
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import com.leuname.lerguie.BuildConfig
import com.leuname.lerguie.R
import com.leuname.lerguie.core.billing.StoreOffer
import com.leuname.lerguie.core.settings.AppSettings
import com.leuname.lerguie.core.settings.DisplayPreference
import com.leuname.lerguie.core.settings.ThemeMode
import com.leuname.lerguie.core.settings.UsageType
import com.leuname.lerguie.core.speech.SpeakerStatus
import com.leuname.lerguie.i18n.LanguagePacks
import com.leuname.lerguie.ui.appContainer
import com.leuname.lerguie.ui.components.BigButton
import com.leuname.lerguie.ui.components.ButtonKind
import com.leuname.lerguie.ui.components.ChoiceRow
import com.leuname.lerguie.ui.components.InfoBanner
import com.leuname.lerguie.ui.components.LerguieHeader
import com.leuname.lerguie.ui.components.ToggleRow
import com.leuname.lerguie.ui.components.findActivity
import com.leuname.lerguie.ui.navigation.Routes
import kotlinx.coroutines.launch

@Composable
fun SettingsScreen(nav: NavHostController) {
    val context = LocalContext.current
    val container = appContainer()
    val s by container.settings.settings.collectAsStateWithLifecycle(AppSettings())
    val speakerState by container.speaker.state.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    var confirmDelete by remember { mutableStateOf(false) }
    val sample = stringResource(R.string.voice_sample)
    val deletedMsg = stringResource(R.string.history_deleted)

    fun update(t: (AppSettings) -> AppSettings) = scope.launch { container.settings.update(t) }

    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        LerguieHeader(onBack = { nav.popBackStack() })
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text(stringResource(R.string.settings_title), style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.semantics { heading() })

            PlanSection()

            Section(stringResource(R.string.settings_usage)) {
                ChoiceRow(
                    listOf(
                        UsageType.BLIND_LOW_VISION to stringResource(R.string.usage_blind),
                        UsageType.DEAF_NONSPEAKING to stringResource(R.string.usage_deaf_nonspeaking),
                        UsageType.DEAF_SPEAKING to stringResource(R.string.usage_deaf_speaking),
                        UsageType.HEARING to stringResource(R.string.usage_hearing),
                    ),
                    s.usageType,
                ) { u -> update { it.copy(usageType = u) } }
            }

            Section(stringResource(R.string.settings_display)) {
                ChoiceRow(
                    listOf(
                        DisplayPreference.TEXT to stringResource(R.string.display_text),
                        DisplayPreference.LIBRAS to stringResource(R.string.display_libras),
                        DisplayPreference.BOTH to stringResource(R.string.display_both),
                    ),
                    s.displayPreference,
                ) { d -> update { it.copy(displayPreference = d) } }
                if (s.displayPreference != DisplayPreference.TEXT) {
                    InfoBanner(stringResource(R.string.libras_presentation_unavailable), Modifier.padding(horizontal = 16.dp))
                }
            }

            Section(stringResource(R.string.settings_accessibility)) {
                val pct = (s.textScale * 100).toInt()
                LabeledSlider(
                    stringResource(R.string.text_size_value, pct), s.textScale,
                    AppSettings.MIN_TEXT_SCALE..AppSettings.MAX_TEXT_SCALE, steps = 11,
                ) { v -> update { it.copy(textScale = v) } }
                ToggleRow(stringResource(R.string.large_buttons), null, s.largeButtons) { v -> update { it.copy(largeButtons = v) } }
                ToggleRow(stringResource(R.string.high_contrast), stringResource(R.string.high_contrast_desc), s.highContrast) { v -> update { it.copy(highContrast = v) } }
                Text(stringResource(R.string.theme), style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(horizontal = 16.dp))
                ChoiceRow(
                    listOf(
                        ThemeMode.LIGHT to stringResource(R.string.theme_light),
                        ThemeMode.DARK to stringResource(R.string.theme_dark),
                        ThemeMode.SYSTEM to stringResource(R.string.theme_system),
                    ),
                    s.themeMode,
                ) { t -> update { it.copy(themeMode = t) } }
                ToggleRow(stringResource(R.string.vibration), stringResource(R.string.vibration_desc), s.vibration) { v -> update { it.copy(vibration = v) } }
                ToggleRow(stringResource(R.string.auto_read), stringResource(R.string.auto_read_desc), s.autoRead) { v -> update { it.copy(autoRead = v) } }
            }

            Section(stringResource(R.string.settings_voice)) {
                if (speakerState.status == SpeakerStatus.MISSING_LANGUAGE || speakerState.status == SpeakerStatus.UNAVAILABLE) {
                    InfoBanner(stringResource(R.string.tts_missing), Modifier.padding(horizontal = 16.dp), warning = true)
                    BigButton(
                        stringResource(R.string.tts_install), Icons.Filled.Download,
                        { runCatching { context.startActivity(Intent(TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } },
                        Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                    )
                }
                if (!speakerState.googleEngine) {
                    InfoBanner(stringResource(R.string.google_tts_suggest), Modifier.padding(horizontal = 16.dp))
                    BigButton(
                        stringResource(R.string.google_tts_install), Icons.Filled.Download,
                        {
                            runCatching {
                                context.startActivity(
                                    Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=com.google.android.tts"))
                                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                )
                            }
                        },
                        Modifier.fillMaxWidth().padding(horizontal = 16.dp), ButtonKind.TONAL,
                    )
                }
                if (speakerState.voices.isNotEmpty()) {
                    Text(stringResource(R.string.voice_choice), style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(horizontal = 16.dp))
                    val autoLabel = stringResource(R.string.voice_auto)
                    val naturalLabel = stringResource(R.string.voice_natural)
                    val localLabel = stringResource(R.string.voice_local)
                    val options = listOf("" to autoLabel) + speakerState.voices.mapIndexed { i, v ->
                        v.name to "${i + 1}. " + (if (v.network) naturalLabel else localLabel)
                    }
                    ChoiceRow(options, s.voiceName) { name ->
                        update { it.copy(voiceName = name) }
                        container.speaker.speak(sample)
                    }
                }
                LabeledSlider(stringResource(R.string.speech_rate_value, s.speechRate), s.speechRate, 0.5f..2f, steps = 5) { v -> update { it.copy(speechRate = v) } }
                LabeledSlider(stringResource(R.string.speech_pitch_value, s.speechPitch), s.speechPitch, 0.5f..2f, steps = 5) { v -> update { it.copy(speechPitch = v) } }
                BigButton(stringResource(R.string.test_voice), Icons.AutoMirrored.Filled.VolumeUp, { container.speaker.speak(sample) },
                    Modifier.fillMaxWidth().padding(horizontal = 16.dp), ButtonKind.TONAL)
                ToggleRow(stringResource(R.string.speak_replies), stringResource(R.string.speak_replies_desc), s.speakReplies) { v -> update { it.copy(speakReplies = v) } }
            }

            Section(stringResource(R.string.settings_vision)) {
                ToggleRow(stringResource(R.string.cloud_ai), stringResource(if (container.api.isConfigured) R.string.cloud_ai_desc else R.string.cloud_ai_not_configured), s.useCloudAi) { v -> update { it.copy(useCloudAi = v) } }
                Text(stringResource(R.string.auto_interval), style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(horizontal = 16.dp))
                ChoiceRow(AppSettings.AUTO_INTERVALS.map { it to stringResource(R.string.seconds_value, it) }, s.autoDescribeIntervalSec) { v ->
                    update { it.copy(autoDescribeIntervalSec = v) }
                }
            }

            Section(stringResource(R.string.memory_title)) {
                Text(stringResource(R.string.memory_explain), style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(horizontal = 16.dp))
                BigButton(stringResource(R.string.memory_open), Icons.Filled.School, { nav.navigate(Routes.MEMORY) },
                    Modifier.fillMaxWidth().padding(horizontal = 16.dp), ButtonKind.TONAL)
            }

            Section(stringResource(R.string.settings_privacy)) {
                ToggleRow(stringResource(R.string.save_history), stringResource(R.string.save_history_desc), s.saveHistory) { v -> update { it.copy(saveHistory = v) } }
                Text(stringResource(R.string.privacy_text), style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(horizontal = 16.dp))
                BigButton(stringResource(R.string.delete_all_history), Icons.Filled.DeleteForever, { confirmDelete = true },
                    Modifier.fillMaxWidth().padding(horizontal = 16.dp), ButtonKind.TONAL)
            }

            Section(stringResource(R.string.settings_profile)) {
                OutlinedTextField(
                    value = s.profileName, onValueChange = { v -> update { it.copy(profileName = v) } },
                    label = { Text(stringResource(R.string.profile_name)) },
                    singleLine = true, modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                )
                Text(stringResource(R.string.profile_local_note), style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(horizontal = 16.dp))
            }

            Section(stringResource(R.string.settings_language)) {
                Text(LanguagePacks.localeOf().getDisplayName(LanguagePacks.localeOf()), style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(horizontal = 16.dp))
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    BigButton(stringResource(R.string.change_language), Icons.Filled.Language, {
                        context.startActivity(
                            Intent(Settings.ACTION_APP_LOCALE_SETTINGS, Uri.fromParts("package", context.packageName, null))
                                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        )
                    }, Modifier.fillMaxWidth().padding(horizontal = 16.dp), ButtonKind.TONAL)
                }
            }

            Section(stringResource(R.string.settings_help)) {
                Text(stringResource(R.string.help_text), style = MaterialTheme.typography.bodyLarge, modifier = Modifier.padding(horizontal = 16.dp))
            }

            Section(stringResource(R.string.settings_about)) {
                Text(stringResource(R.string.about_text, BuildConfig.VERSION_NAME), style = MaterialTheme.typography.bodyLarge, modifier = Modifier.padding(horizontal = 16.dp))
            }
        }
    }

    if (confirmDelete) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            title = { Text(stringResource(R.string.delete_all_history)) },
            text = { Text(stringResource(R.string.delete_all_confirm)) },
            confirmButton = {
                TextButton(onClick = {
                    confirmDelete = false
                    scope.launch {
                        container.history.deleteAll()
                        container.speaker.speak(deletedMsg)
                    }
                }) { Text(stringResource(R.string.delete)) }
            },
            dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text(stringResource(R.string.cancel)) } },
        )
    }
}

/** Plano e assinatura. Funções essenciais nunca dependem disto. */
@Composable
private fun PlanSection() {
    val context = LocalContext.current
    val container = appContainer()
    val ent by container.entitlements.entitlements.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    var offers by remember { mutableStateOf<List<StoreOffer>>(emptyList()) }
    val tag = LanguagePacks.current().languageTag

    LaunchedEffect(ent.catalog.monetizationEnabled) {
        offers = runCatching { container.entitlements.offers() }.getOrDefault(emptyList())
    }

    Section(stringResource(R.string.settings_plan)) {
        Text(stringResource(R.string.plan_current, ent.plan.localizedName(tag)), style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(horizontal = 16.dp))
        Text(stringResource(R.string.plan_essentials_free), style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(horizontal = 16.dp))
        if (ent.catalog.monetizationEnabled) {
            offers.forEach { offer ->
                val plan = ent.catalog.plans.firstOrNull { it.productId == offer.productId }
                val name = plan?.localizedName(tag) ?: offer.productId
                BigButton(
                    stringResource(R.string.plan_subscribe, name, offer.formattedPrice), Icons.Filled.Star,
                    { context.findActivity()?.let { a -> scope.launch { runCatching { container.entitlements.subscribe(a, offer) } } } },
                    Modifier.fillMaxWidth().padding(horizontal = 16.dp), ButtonKind.PRIMARY,
                )
                plan?.localizedDescription(tag)?.takeIf { it.isNotBlank() }?.let {
                    Text(it, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(horizontal = 16.dp))
                }
            }
            Row(Modifier.padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                BigButton(stringResource(R.string.plan_restore), Icons.Filled.Restore,
                    { scope.launch { runCatching { container.entitlements.restorePurchases() } } }, Modifier.weight(1f), ButtonKind.TONAL)
                BigButton(stringResource(R.string.plan_manage), null, {
                    context.startActivity(
                        Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/account/subscriptions?package=${context.packageName}"))
                            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    )
                }, Modifier.weight(1f), ButtonKind.TONAL)
            }
        }
    }
}

@Composable
private fun Section(title: String, content: @Composable ColumnScope.() -> Unit) {
    Surface(shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surface, modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(vertical = 14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(title, style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(horizontal = 16.dp).semantics { heading() })
            content()
        }
    }
}

@Composable
private fun LabeledSlider(label: String, value: Float, range: ClosedFloatingPointRange<Float>, steps: Int, onChange: (Float) -> Unit) {
    Column(Modifier.padding(horizontal = 16.dp)) {
        Text(label, style = MaterialTheme.typography.titleMedium)
        Slider(
            value = value, onValueChange = onChange, valueRange = range, steps = steps,
            modifier = Modifier.semantics {
                contentDescription = label
                stateDescription = label
            },
        )
    }
}
