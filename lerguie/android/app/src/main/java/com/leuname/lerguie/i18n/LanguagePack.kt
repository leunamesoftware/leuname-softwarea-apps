package com.leuname.lerguie.i18n

import com.leuname.lerguie.core.voice.VoiceCommand
import java.util.Locale

/** Termo traduzido de um rótulo de visão. [hazard] marca rótulos que geram alerta. */
data class Term(val name: String, val withArticle: String, val hazard: String? = null)

enum class Position { LEFT, FRONT, RIGHT }

enum class ColorName { BLACK, WHITE, GRAY, WINE, RED, BROWN, ORANGE, DARK_BROWN, YELLOW, GREEN, LIGHT_BLUE, BLUE, PURPLE, PINK }

/**
 * Internacionalização do conteúdo GERADO pelo app (frases faladas, rótulos de visão,
 * comandos de voz). Textos fixos da interface ficam em res/values/strings.xml
 * (e res/values-en, res/values-es... quando houver tradução).
 *
 * Para adicionar um idioma: 1) crie res/values-xx/strings.xml; 2) implemente um
 * LanguagePack (copie PtBrLanguagePack); 3) registre em [LanguagePacks]; 4) inclua o
 * idioma em res/xml/locales_config.xml e em resourceConfigurations (app/build.gradle.kts).
 */
interface LanguagePack {
    val languageTag: String
    val labels: Map<String, Term>
    val objectCategories: Map<String, Term>
    val voiceCommands: List<Pair<VoiceCommand, List<String>>>
    val unreadable: String
    val uncertainPrefix: String
    val wakeWord: String

    fun sure(thing: Term): String
    fun likely(thing: Term): String
    fun uncertain(text: String): String
    fun attention(hazards: List<String>): String
    fun position(p: Position): String
    fun personAt(position: String): String
    fun oneObjectAt(position: String): String
    fun manyObjects(count: Int): String
    fun alsoSeen(names: List<String>): String
    fun objectAt(what: String?, position: String, near: Boolean): String
    fun vehicleNear(position: String): String
    fun dominantColor(color: ColorName): String
    fun colorName(color: ColorName): String
}

object LanguagePacks {
    private val all: List<LanguagePack> by lazy { listOf(PtBrLanguagePack) }

    /** Pacote do idioma atual do app; português do Brasil é o padrão. */
    fun current(locale: Locale = Locale.getDefault()): LanguagePack =
        all.firstOrNull { it.languageTag.equals(locale.toLanguageTag(), ignoreCase = true) }
            ?: all.firstOrNull { Locale.forLanguageTag(it.languageTag).language == locale.language }
            ?: PtBrLanguagePack

    fun localeOf(pack: LanguagePack = current()): Locale = Locale.forLanguageTag(pack.languageTag)
}
