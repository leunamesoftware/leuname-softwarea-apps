package com.leuname.lerguie.ui.onboarding

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Hearing
import androidx.compose.material.icons.filled.HearingDisabled
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.PanTool
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.leuname.lerguie.R
import com.leuname.lerguie.core.haptics.HapticEvent
import com.leuname.lerguie.core.settings.UsageType
import com.leuname.lerguie.core.voice.VoiceCommandParser
import com.leuname.lerguie.i18n.LanguagePacks
import com.leuname.lerguie.ui.appContainer
import com.leuname.lerguie.ui.components.BigButton
import com.leuname.lerguie.ui.components.ButtonKind
import com.leuname.lerguie.ui.components.HoldToTalkButton
import com.leuname.lerguie.ui.components.LerguieHeader
import com.leuname.lerguie.ui.components.rememberHoldListener
import com.leuname.lerguie.ui.navigation.Routes
import kotlinx.coroutines.launch

/** Primeira abertura: escolher o perfil por toque ou por voz. O app se adapta a ele. */
@Composable
fun OnboardingScreen(nav: NavHostController) {
    val container = appContainer()
    val scope = rememberCoroutineScope()
    val welcome = stringResource(R.string.onboarding_spoken)
    val notUnderstood = stringResource(R.string.onboarding_not_understood)
    val labels = mapOf(
        UsageType.BLIND_LOW_VISION to stringResource(R.string.usage_blind),
        UsageType.DEAF_NONSPEAKING to stringResource(R.string.usage_deaf_nonspeaking),
        UsageType.DEAF_SPEAKING to stringResource(R.string.usage_deaf_speaking),
        UsageType.CANNOT_READ to stringResource(R.string.usage_cannot_read),
        UsageType.HEARING to stringResource(R.string.usage_hearing),
    )
    val ready = stringResource(R.string.onboarding_ready)

    fun choose(u: UsageType) {
        scope.launch {
            container.settings.update { it.withProfile(u) }
            container.haptics.play(HapticEvent.SUCCESS)
            container.speaker.speak(ready.format(labels.getValue(u)))
            nav.navigate(Routes.HOME) { popUpTo(Routes.ONBOARDING) { inclusive = true } }
        }
    }

    val hold = rememberHoldListener { spoken ->
        val text = VoiceCommandParser.normalize(spoken)
        val u = LanguagePacks.current().profileWords.firstOrNull { (_, words) -> words.any { text.contains(it) } }?.first
        if (u != null) choose(u) else container.speaker.speak(notUnderstood)
    }

    LaunchedEffect(Unit) { container.speaker.speak(welcome, "welcome") }

    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        LerguieHeader(big = true)
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(stringResource(R.string.onboarding_title), style = MaterialTheme.typography.headlineSmall,
                color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.semantics { heading() })
            HoldToTalkButton(
                label = stringResource(R.string.onboarding_hold),
                listeningLabel = stringResource(R.string.assistant_listening),
                listening = hold.state.listening, level = hold.state.level,
                onStart = hold.start, onStop = hold.stop, modifier = Modifier.fillMaxWidth(),
            )
            val icons = mapOf(
                UsageType.BLIND_LOW_VISION to Icons.Filled.VisibilityOff,
                UsageType.DEAF_NONSPEAKING to Icons.Filled.PanTool,
                UsageType.DEAF_SPEAKING to Icons.Filled.HearingDisabled,
                UsageType.CANNOT_READ to Icons.Filled.MenuBook,
                UsageType.HEARING to Icons.Filled.People,
            )
            UsageType.entries.forEach { u ->
                BigButton(
                    labels.getValue(u), icons.getValue(u), { choose(u) },
                    Modifier.fillMaxWidth().heightIn(min = 80.dp),
                    if (u == UsageType.BLIND_LOW_VISION) ButtonKind.PRIMARY else ButtonKind.SECONDARY,
                )
            }
        }
    }
}
