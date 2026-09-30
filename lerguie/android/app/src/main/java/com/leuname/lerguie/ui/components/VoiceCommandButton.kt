package com.leuname.lerguie.ui.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardVoice
import androidx.compose.material.icons.filled.MicOff
import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import androidx.navigation.NavHostController
import com.leuname.lerguie.R

/** Ícone de comando de voz no cabeçalho: toque para falar, toque de novo para enviar. */
@Composable
fun VoiceCommandButton(nav: NavHostController) {
    val assistant = rememberVoiceAssistant(nav)
    val listening = assistant.state.listening
    HeaderAction(
        icon = if (listening) Icons.Filled.MicOff else Icons.Filled.KeyboardVoice,
        label = stringResource(if (listening) R.string.voice_stop else R.string.voice_command),
        onClick = { if (listening) assistant.stop() else assistant.start() },
    )
}
