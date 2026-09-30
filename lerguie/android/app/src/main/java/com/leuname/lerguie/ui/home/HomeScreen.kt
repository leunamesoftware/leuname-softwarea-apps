package com.leuname.lerguie.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.ChatBubble
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import kotlinx.coroutines.launch
import com.leuname.lerguie.core.update.UpdateInfo
import com.leuname.lerguie.ui.components.BigButton
import com.leuname.lerguie.ui.components.ButtonKind
import com.leuname.lerguie.ui.components.InfoBanner
import androidx.compose.material.icons.filled.SystemUpdate
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.leuname.lerguie.core.settings.AppSettings
import com.leuname.lerguie.ui.appContainer
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.leuname.lerguie.R
import com.leuname.lerguie.ui.components.FeatureCard
import com.leuname.lerguie.ui.components.HeaderAction
import com.leuname.lerguie.ui.components.HoldToTalkButton
import com.leuname.lerguie.ui.components.rememberVoiceAssistant
import com.leuname.lerguie.ui.components.LerguieHeader
import com.leuname.lerguie.ui.navigation.Routes
import com.leuname.lerguie.ui.navigation.navigateTab
import com.leuname.lerguie.ui.theme.LocalBrand

@Composable
fun HomeScreen(nav: NavHostController) {
    val brand = LocalBrand.current
    val settings by appContainer().settings.settings.collectAsStateWithLifecycle(AppSettings())
    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        LerguieHeader(big = true) {
            HeaderAction(Icons.Filled.Settings, stringResource(R.string.tab_settings)) { nav.navigateTab(Routes.SETTINGS) }
        }
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            // Assistente: segure, fale ("quero um leite", "quero ir ao mercado", "ler"...) e solte.
            val assistant = rememberVoiceAssistant(nav)
            if (!settings.deaf) HoldToTalkButton(
                label = stringResource(R.string.assistant_hold),
                listeningLabel = stringResource(R.string.assistant_listening),
                listening = assistant.state.listening,
                level = assistant.state.level,
                onStart = assistant.start,
                onStop = assistant.stop,
                modifier = Modifier.fillMaxWidth(),
            )
            UpdateBanner()
            // A ordem dos cartões segue o perfil: quem é surdo vê Comunicar e Ouvir primeiro.
            val see: @Composable (Modifier) -> Unit = { m ->
                FeatureCard(stringResource(R.string.feature_see), stringResource(R.string.feature_see_desc),
                    Icons.Filled.PhotoCamera, brand.seeGradient, { nav.navigate(Routes.see()) }, m)
            }
            val read: @Composable (Modifier) -> Unit = { m ->
                FeatureCard(stringResource(R.string.feature_read), stringResource(R.string.feature_read_desc),
                    Icons.Filled.Description, brand.readGradient, { nav.navigate(Routes.read()) }, m)
            }
            val listen: @Composable (Modifier) -> Unit = { m ->
                FeatureCard(stringResource(R.string.feature_listen), stringResource(R.string.feature_listen_desc),
                    Icons.Filled.Mic, brand.listenGradient, { nav.navigate(Routes.LISTEN) }, m)
            }
            val communicate: @Composable (Modifier) -> Unit = { m ->
                FeatureCard(stringResource(R.string.feature_communicate), stringResource(R.string.feature_communicate_desc),
                    Icons.Filled.ChatBubble, brand.communicateGradient, { nav.navigate(Routes.COMMUNICATE) }, m)
            }
            val order = if (settings.deaf) listOf(communicate, listen, read, see) else listOf(see, read, listen, communicate)
            order.chunked(2).forEach { pair ->
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    pair.forEach { card -> card(Modifier.weight(1f)) }
                }
            }
            val historyTitle = stringResource(R.string.tab_history)
            val historyDesc = stringResource(R.string.history_home_desc)
            Row(
                Modifier
                    .fillMaxWidth()
                    .heightIn(min = 72.dp)
                    .clip(RoundedCornerShape(20.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant)
                    .clickable(role = Role.Button) { nav.navigateTab(Routes.history(false)) }
                    .semantics(mergeDescendants = true) { contentDescription = "$historyTitle. $historyDesc" }
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Filled.History, null, Modifier.size(40.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.width(16.dp))
                Column(Modifier.weight(1f)) {
                    Text(historyTitle, style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(historyDesc, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

/** Aviso de nova versão de teste, com download e instalação em um toque. */
@Composable
private fun UpdateBanner() {
    val container = appContainer()
    val scope = rememberCoroutineScope()
    var info by remember { mutableStateOf<UpdateInfo?>(null) }
    var progress by remember { mutableStateOf<Float?>(null) }
    val available = stringResource(R.string.update_available)
    LaunchedEffect(Unit) {
        info = container.updater.check()
        if (info != null) container.speaker.speakQueued(available, "update")
    }
    val update = info ?: return
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        InfoBanner(available, icon = Icons.Filled.SystemUpdate)
        BigButton(
            progress?.let { stringResource(R.string.update_downloading, (it * 100).toInt()) } ?: stringResource(R.string.update_now),
            Icons.Filled.SystemUpdate,
            {
                if (progress == null) scope.launch {
                    progress = 0f
                    val file = container.updater.download(update) { p -> progress = p }
                    progress = null
                    if (file != null) container.updater.install(file)
                }
            },
            Modifier.fillMaxWidth(), ButtonKind.PRIMARY, enabled = progress == null,
        )
    }
}
