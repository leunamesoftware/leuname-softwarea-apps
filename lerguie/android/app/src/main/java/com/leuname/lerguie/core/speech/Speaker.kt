package com.leuname.lerguie.core.speech

import android.content.Context
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import com.leuname.lerguie.i18n.LanguagePacks
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

enum class SpeakerStatus { INITIALIZING, READY, MISSING_LANGUAGE, UNAVAILABLE }

data class SpeakerState(
    val status: SpeakerStatus = SpeakerStatus.INITIALIZING,
    val speakingId: String? = null,
    val voices: List<VoiceOption> = emptyList(),
    val currentVoice: String? = null,
    /** Motor de voz do Google instalado (vozes mais naturais). */
    val googleEngine: Boolean = false,
)

/** Voz disponível no aparelho. [network] = voz neural que usa internet (mais natural). */
data class VoiceOption(val name: String, val network: Boolean, val quality: Int)

/**
 * Texto para voz (TTS nativo do Android: funciona offline quando a voz pt-BR está instalada).
 * Cada fala recebe um id para a interface saber o que está sendo lido (destaque, pausar/continuar).
 */
class Speaker(context: Context, private val isOnline: () -> Boolean = { true }) : TextToSpeech.OnInitListener {
    private val googleInstalled = runCatching {
        context.packageManager.getPackageInfo(GOOGLE_TTS, 0); true
    }.getOrDefault(false)
    private val _state = MutableStateFlow(SpeakerState(googleEngine = googleInstalled))
    val state: StateFlow<SpeakerState> = _state.asStateFlow()

    private val pending = mutableListOf<Pair<String, String>>()
    private var rate = 1f
    private var pitch = 1f
    private var preferredVoice: String = ""
    private var appliedForOnline: Boolean? = null
    // Prefere o motor do Google (vozes neurais mais naturais); senão, o padrão do aparelho.
    private val tts = if (googleInstalled) TextToSpeech(context.applicationContext, this, GOOGLE_TTS)
    else TextToSpeech(context.applicationContext, this)

    override fun onInit(status: Int) {
        if (status != TextToSpeech.SUCCESS) {
            _state.update { it.copy(status = SpeakerStatus.UNAVAILABLE) }
            return
        }
        val result = tts.setLanguage(LanguagePacks.localeOf())
        val ok = result != TextToSpeech.LANG_MISSING_DATA && result != TextToSpeech.LANG_NOT_SUPPORTED
        tts.setSpeechRate(rate)
        tts.setPitch(pitch)
        tts.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(utteranceId: String?) {
                _state.update { it.copy(speakingId = utteranceId) }
            }

            override fun onDone(utteranceId: String?) {
                _state.update { if (it.speakingId == utteranceId) it.copy(speakingId = null) else it }
            }

            @Deprecated("Deprecated in Java")
            override fun onError(utteranceId: String?) {
                _state.update { it.copy(speakingId = null) }
            }

            override fun onStop(utteranceId: String?, interrupted: Boolean) {
                _state.update { it.copy(speakingId = null) }
            }
        })
        _state.update { it.copy(status = if (ok) SpeakerStatus.READY else SpeakerStatus.MISSING_LANGUAGE) }
        if (ok) {
            refreshVoices()
            applyBestVoice(force = true)
            val queued = pending.toList()
            pending.clear()
            queued.forEachIndexed { i, (id, text) -> enqueue(id, text, flush = i == 0) }
        }
    }

    fun configure(rate: Float, pitch: Float, voiceName: String = "") {
        this.rate = rate
        this.pitch = pitch
        val voiceChanged = voiceName != preferredVoice
        preferredVoice = voiceName
        if (_state.value.status == SpeakerStatus.READY) {
            tts.setSpeechRate(rate)
            tts.setPitch(pitch)
            if (voiceChanged) applyBestVoice(force = true)
        }
    }

    private fun refreshVoices() {
        val locale = LanguagePacks.localeOf()
        val list = runCatching { tts.voices }.getOrNull().orEmpty()
            .filter { v ->
                v.locale.language == locale.language &&
                    (locale.country.isEmpty() || v.locale.country.isEmpty() || v.locale.country == locale.country) &&
                    !v.features.orEmpty().contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)
            }
            .map { VoiceOption(it.name, it.isNetworkConnectionRequired, it.quality) }
            .sortedWith(compareByDescending<VoiceOption> { it.network }.thenByDescending { it.quality }.thenBy { it.name })
        _state.update { it.copy(voices = list) }
    }

    /**
     * Escolhe a voz: a preferida do usuário; senão a mais natural disponível
     * (neural pela internet quando online, local de melhor qualidade quando offline).
     */
    private fun applyBestVoice(force: Boolean) {
        val online = isOnline()
        if (!force && preferredVoice.isEmpty() && appliedForOnline == online) return
        appliedForOnline = online
        val voices = runCatching { tts.voices }.getOrNull().orEmpty()
        val options = _state.value.voices
        val chosen = options.firstOrNull { it.name == preferredVoice && (online || !it.network) }
            ?: options.filter { online || !it.network }
                .maxWithOrNull(compareBy<VoiceOption> { it.quality }.thenBy { if (online) it.network else !it.network })
            ?: return
        voices.firstOrNull { it.name == chosen.name }?.let { v ->
            if (tts.setVoice(v) == TextToSpeech.SUCCESS) _state.update { it.copy(currentVoice = v.name) }
        }
    }

    /** Fala o texto interrompendo o que estiver sendo lido. */
    fun speak(text: String, id: String = "speech") = speakAll(listOf(id to text))

    /** Fala vários trechos em sequência (ex.: blocos de um documento). */
    fun speakAll(items: List<Pair<String, String>>) {
        val clean = items.filter { it.second.isNotBlank() }
        if (clean.isEmpty()) return
        when (_state.value.status) {
            SpeakerStatus.READY -> clean.forEachIndexed { i, (id, text) -> enqueue(id, text, flush = i == 0) }
            SpeakerStatus.INITIALIZING -> {
                pending.clear()
                pending.addAll(clean)
            }
            else -> Unit
        }
    }

    /** Adiciona à fila sem interromper o que está sendo falado. */
    fun speakQueued(text: String, id: String = "speech") {
        if (_state.value.status == SpeakerStatus.READY && text.isNotBlank()) enqueue(id, text, flush = false)
    }

    /** Fala uma vez com velocidade diferente (ex.: "Mais lento"). */
    fun speakWithRate(text: String, rateMultiplier: Float, id: String = "speech") {
        if (_state.value.status != SpeakerStatus.READY) return speak(text, id)
        tts.setSpeechRate(rate * rateMultiplier)
        enqueue(id, text, flush = true)
        tts.setSpeechRate(rate)
    }

    fun stop() {
        pending.clear()
        if (_state.value.status == SpeakerStatus.READY) tts.stop()
        _state.update { it.copy(speakingId = null) }
    }

    private fun enqueue(id: String, text: String, flush: Boolean) {
        // Sem internet, troca automaticamente da voz neural para a voz local.
        applyBestVoice(force = false)
        // Limite do motor de TTS por fala; textos longos são divididos em partes.
        val max = TextToSpeech.getMaxSpeechInputLength() - 1
        val parts = splitForSpeech(text, max)
        parts.forEachIndexed { i, part ->
            val mode = if (flush && i == 0) TextToSpeech.QUEUE_FLUSH else TextToSpeech.QUEUE_ADD
            tts.speak(part, mode, null, id)
        }
    }

    companion object {
        const val GOOGLE_TTS = "com.google.android.tts"

        fun splitForSpeech(text: String, max: Int): List<String> {
            if (text.length <= max) return listOf(text)
            val out = mutableListOf<String>()
            var rest = text
            while (rest.length > max) {
                val cut = rest.lastIndexOfAny(charArrayOf('.', '!', '?', ';', '\n', ' '), max - 1).takeIf { it > 0 } ?: (max - 1)
                out += rest.substring(0, cut + 1).trim()
                rest = rest.substring(cut + 1)
            }
            if (rest.isNotBlank()) out += rest.trim()
            return out
        }
    }
}
