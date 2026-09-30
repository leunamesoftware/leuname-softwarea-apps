package com.leuname.lerguie.ui.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.leuname.lerguie.R
import com.leuname.lerguie.core.voice.VoiceCommand
import com.leuname.lerguie.ui.ask.AskHelpScreen
import com.leuname.lerguie.ui.communicate.CommunicateScreen
import com.leuname.lerguie.ui.onboarding.OnboardingScreen
import com.leuname.lerguie.ui.history.HistoryScreen
import com.leuname.lerguie.ui.home.HomeScreen
import com.leuname.lerguie.ui.listen.ListenScreen
import com.leuname.lerguie.ui.memory.MemoryScreen
import com.leuname.lerguie.ui.memory.TeachScreen
import com.leuname.lerguie.ui.read.ReadResultScreen
import com.leuname.lerguie.ui.read.ReadScreen
import com.leuname.lerguie.ui.see.SeeResultScreen
import com.leuname.lerguie.ui.see.SeeScreen
import com.leuname.lerguie.ui.settings.SettingsScreen

object Routes {
    const val HOME = "home"
    const val SEE = "see?find={find}"
    fun see(find: String = "") = "see?find=" + android.net.Uri.encode(find)
    const val SEE_RESULT = "see/result"
    const val READ = "read?mode={mode}"
    fun read(mode: String = "TEXT") = "read?mode=$mode"
    const val READ_RESULT = "read/result"
    const val LISTEN = "listen"
    const val COMMUNICATE = "communicate"
    const val SETTINGS = "settings"
    const val MEMORY = "memory"
    const val ONBOARDING = "onboarding"
    const val ASK = "ask?item={item}"
    fun ask(item: String) = "ask?item=" + android.net.Uri.encode(item)
    const val TEACH = "memory/teach"
    const val HISTORY = "history?favorites={favorites}"
    fun history(favorites: Boolean) = "history?favorites=$favorites"
}

private data class Tab(val route: String, val matches: (String?) -> Boolean, val label: Int, val icon: ImageVector)

private val tabs = listOf(
    Tab(Routes.HOME, { it == Routes.HOME }, R.string.tab_home, Icons.Filled.Home),
    Tab(Routes.history(false), { false }, R.string.tab_history, Icons.Filled.History),
    Tab(Routes.history(true), { false }, R.string.tab_favorites, Icons.Filled.Favorite),
    Tab(Routes.SETTINGS, { it == Routes.SETTINGS }, R.string.tab_settings, Icons.Filled.Settings),
)

fun NavHostController.navigateTab(route: String) {
    navigate(route) {
        popUpTo(graph.findStartDestination().id) { saveState = false }
        launchSingleTop = true
    }
}

/** Navegação acionada por comando de voz. */
fun NavHostController.handleVoiceNavigation(command: VoiceCommand): Boolean {
    val route = when (command) {
        VoiceCommand.SEE -> Routes.see()
        VoiceCommand.READ -> Routes.read()
        VoiceCommand.LISTEN -> Routes.LISTEN
        VoiceCommand.COMMUNICATE -> Routes.COMMUNICATE
        VoiceCommand.HISTORY -> Routes.history(false)
        VoiceCommand.FAVORITES -> Routes.history(true)
        VoiceCommand.SETTINGS -> Routes.SETTINGS
        VoiceCommand.HOME -> Routes.HOME
        else -> return false
    }
    navigateTab(route)
    return true
}

@Composable
fun LerguieNavHost(startOnboarding: Boolean = false, nav: NavHostController = rememberNavController()) {
    val entry by nav.currentBackStackEntryAsState()
    val route = entry?.destination?.route
    val favoritesArg = entry?.arguments?.getBoolean("favorites") ?: false
    val showBar = route == Routes.HOME || route == Routes.HISTORY || route == Routes.SETTINGS

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        bottomBar = {
            if (showBar) {
                NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
                    tabs.forEachIndexed { i, tab ->
                        val selected = when (i) {
                            1 -> route == Routes.HISTORY && !favoritesArg
                            2 -> route == Routes.HISTORY && favoritesArg
                            else -> tab.matches(route)
                        }
                        NavigationBarItem(
                            selected = selected,
                            onClick = { nav.navigateTab(tab.route) },
                            icon = { Icon(tab.icon, contentDescription = null) },
                            label = { Text(stringResource(tab.label), style = MaterialTheme.typography.labelMedium) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = MaterialTheme.colorScheme.secondary,
                                selectedTextColor = MaterialTheme.colorScheme.secondary,
                            ),
                        )
                    }
                }
            }
        },
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            NavHost(navController = nav, startDestination = if (startOnboarding) Routes.ONBOARDING else Routes.HOME) {
                composable(Routes.ONBOARDING) { OnboardingScreen(nav) }
                composable(
                    Routes.ASK,
                    arguments = listOf(navArgument("item") { type = NavType.StringType; defaultValue = "" }),
                ) { e -> AskHelpScreen(nav, e.arguments?.getString("item").orEmpty()) }
                composable(Routes.HOME) { HomeScreen(nav) }
                composable(
                    Routes.SEE,
                    arguments = listOf(navArgument("find") { type = NavType.StringType; defaultValue = "" }),
                ) { e -> SeeScreen(nav, find = e.arguments?.getString("find").orEmpty()) }
                composable(Routes.SEE_RESULT) { SeeResultScreen(nav) }
                composable(
                    Routes.READ,
                    arguments = listOf(navArgument("mode") { type = NavType.StringType; defaultValue = "TEXT" }),
                ) { e -> ReadScreen(nav, initialMode = e.arguments?.getString("mode") ?: "TEXT") }
                composable(Routes.READ_RESULT) { ReadResultScreen(nav) }
                composable(Routes.LISTEN) { ListenScreen(nav) }
                composable(Routes.COMMUNICATE) { CommunicateScreen(nav) }
                composable(Routes.SETTINGS) { SettingsScreen(nav) }
                composable(Routes.MEMORY) { MemoryScreen(nav) }
                composable(Routes.TEACH) { TeachScreen(nav) }
                composable(
                    Routes.HISTORY,
                    arguments = listOf(navArgument("favorites") { type = NavType.BoolType; defaultValue = false }),
                ) { e -> HistoryScreen(nav, favoritesOnly = e.arguments?.getBoolean("favorites") ?: false) }
            }
        }
    }
}
