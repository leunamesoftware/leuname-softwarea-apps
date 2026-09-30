package com.leuname.lerguie.i18n

import com.leuname.lerguie.core.voice.VoiceCommand
import java.util.Locale

/** Termo traduzido de um rótulo de visão. [hazard] marca rótulos que geram alerta. */
data class Term(val name: String, val withArticle: String, val hazard: String? = null)

enum class Position { LEFT, FRONT, RIGHT }

enum class Proximity { NEAR, MEDIUM, FAR }

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
    /** Nomes das 80 classes COCO do detector em tempo real. */
    val cocoLabels: Map<String, Term>
    /** Nome da classe [index] do classificador de 1000 objetos (ImageNet). */
    fun imagenet(index: Int): Term?
    val voiceCommands: List<Pair<VoiceCommand, List<String>>>
    val unreadable: String
    val uncertainPrefix: String
    val wakeWord: String
    /** Frases que pedem navegação a pé ("quero ir ao", "me leve para"...), já normalizadas. */
    val navigatePhrases: List<String>
    /** Frases que pedem para procurar algo pela câmera ("quero", "procurar"...). */
    val findPhrases: List<String>
    /** Artigos/preposições ignorados no início do argumento. */
    val fillerWords: Set<String>
    fun findingStart(item: String): String
    fun navigatingStart(place: String): String
    fun found(text: String): String
    fun writtenText(text: String): String
    /** Pergunta falada em voz alta para alguém por perto. */
    fun askQuestion(item: String): String
    fun theyAnswered(text: String): String
    /** Palavras que indicam cada perfil, para escolher por voz na primeira vez. */
    val profileWords: List<Pair<com.leuname.lerguie.core.settings.UsageType, List<String>>>

    fun sure(thing: Term): String
    fun likely(thing: Term): String
    fun uncertain(text: String): String
    fun attention(hazards: List<String>): String
    fun position(p: Position): String
    fun alsoSeen(names: List<String>): String
    fun vehicleNear(position: String): String
    fun proximity(p: Proximity): String
    /** Frase completa: "Há uma pessoa à sua frente, bem perto." */
    fun detectedAt(thing: Term, position: String, proximity: Proximity): String
    /** Frase curta para o modo Caminhar: "Carro à sua direita, bem perto." */
    fun walkItem(thing: Term, position: String, proximity: Proximity): String
    fun alsoAround(items: List<String>): String
    /** Objetos ensinados pelo usuário/ajudante. */
    fun knownSure(name: String): String
    fun knownLikely(name: String): String
    fun knownWalk(name: String): String
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
