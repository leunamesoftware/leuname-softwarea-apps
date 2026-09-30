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
import com.leuname.lerguie.ui.components.LerguieHeader
import com.leuname.lerguie.ui.components.VoiceCommandButton
import com.leuname.lerguie.ui.navigation.Routes
import com.leuname.lerguie.ui.navigation.navigateTab
import com.leuname.lerguie.ui.theme.LocalBrand

@Composable
fun HomeScreen(nav: NavHostController) {
    val brand = LocalBrand.current
    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        LerguieHeader(big = true) {
            VoiceCommandButton(nav)
            HeaderAction(Icons.Filled.Settings, stringResource(R.string.tab_settings)) { nav.navigateTab(Routes.SETTINGS) }
        }
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                FeatureCard(
                    stringResource(R.string.feature_see), stringResource(R.string.feature_see_desc),
                    Icons.Filled.PhotoCamera, brand.seeGradient, { nav.navigate(Routes.SEE) }, Modifier.weight(1f),
                )
                FeatureCard(
                    stringResource(R.string.feature_read), stringResource(R.string.feature_read_desc),
                    Icons.Filled.Description, brand.readGradient, { nav.navigate(Routes.read()) }, Modifier.weight(1f),
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                FeatureCard(
                    stringResource(R.string.feature_listen), stringResource(R.string.feature_listen_desc),
                    Icons.Filled.Mic, brand.listenGradient, { nav.navigate(Routes.LISTEN) }, Modifier.weight(1f),
                )
                FeatureCard(
                    stringResource(R.string.feature_communicate), stringResource(R.string.feature_communicate_desc),
                    Icons.Filled.ChatBubble, brand.communicateGradient, { nav.navigate(Routes.COMMUNICATE) }, Modifier.weight(1f),
                )
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
