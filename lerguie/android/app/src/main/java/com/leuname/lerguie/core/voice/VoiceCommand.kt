package com.leuname.lerguie.core.voice

import com.leuname.lerguie.i18n.LanguagePack
import com.leuname.lerguie.i18n.LanguagePacks
import java.text.Normalizer
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow

enum class VoiceCommand { SEE, READ, LISTEN, COMMUNICATE, REPEAT, SAVE, HISTORY, FAVORITES, SETTINGS, HOME, STOP, FIND, NAVIGATE }

/** Comando + argumento (ex.: FIND "leite", NAVIGATE "mercado"). */
data class ParsedCommand(val command: VoiceCommand, val argument: String? = null)

/**
 * Entende frases naturais: "Lerguie, ler", "o que estou vendo", "quero um leite",
 * "quero ir ao mercado". Frases e sinônimos ficam no pacote de idioma (i18n).
 */
object VoiceCommandParser {
    fun parse(spoken: String, pack: LanguagePack = LanguagePacks.current()): VoiceCommand? = parseFull(spoken, pack)?.command

    fun parseFull(spoken: String, pack: LanguagePack = LanguagePacks.current()): ParsedCommand? {
        val text = normalize(spoken).removePrefix(pack.wakeWord).trim()
        if (text.isEmpty()) return null
        // Navegação e procura têm argumento e vêm antes dos comandos simples.
        extract(text, pack.navigatePhrases, pack)?.let { return ParsedCommand(VoiceCommand.NAVIGATE, it) }
        extract(text, pack.findPhrases, pack)?.let { return ParsedCommand(VoiceCommand.FIND, it) }
        val words = text.split(" ")
        return pack.voiceCommands.firstOrNull { (_, keys) ->
            keys.any { key -> if (key.contains(' ')) text.contains(key) else key in words }
        }?.first?.let { ParsedCommand(it) }
    }

    private fun extract(text: String, phrases: List<String>, pack: LanguagePack): String? {
        val padded = " $text "
        for (p in phrases.sortedByDescending { it.length }) {
            val i = padded.indexOf(" $p ")
            if (i < 0) continue
            val rest = padded.substring(i + p.length + 2).trim().split(" ").dropWhile { it in pack.fillerWords }
            val arg = rest.joinToString(" ").trim()
            if (arg.isNotEmpty()) return arg
        }
        return null
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
