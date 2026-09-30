package com.leuname.lerguie.core.voice

import com.leuname.lerguie.i18n.LanguagePack
import com.leuname.lerguie.i18n.LanguagePacks
import java.text.Normalizer
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow

enum class VoiceCommand { SEE, READ, LISTEN, COMMUNICATE, REPEAT, SAVE, HISTORY, FAVORITES, SETTINGS, HOME, STOP }

/**
 * Converte a fala em um comando. Aceita com ou sem "Lerguie," no início.
 * Sinônimos ficam no pacote de idioma (i18n); novos comandos: adicionar lá.
 */
object VoiceCommandParser {
    fun parse(spoken: String, pack: LanguagePack = LanguagePacks.current()): VoiceCommand? {
        val text = normalize(spoken).removePrefix(pack.wakeWord).trim()
        if (text.isEmpty()) return null
        val words = text.split(" ")
        return pack.voiceCommands.firstOrNull { (_, keys) ->
            keys.any { key -> if (key.contains(' ')) text.contains(key) else key in words }
        }?.first
    }

    fun normalize(s: String): String =
        Normalizer.normalize(s.lowercase(), Normalizer.Form.NFD)
            .replace(Regex("\\p{Mn}+"), "")
            .replace(Regex("[^a-z0-9 ]"), " ")
            .replace(Regex("\\s+"), " ")
            .trim()
}

/** Canal para a tela atual reagir a "repetir", "salvar" e "parar". */
class VoiceCommandBus {
    private val _commands = MutableSharedFlow<VoiceCommand>(extraBufferCapacity = 4)
    val commands: SharedFlow<VoiceCommand> = _commands.asSharedFlow()
    fun emit(command: VoiceCommand) {
        _commands.tryEmit(command)
    }
}
