package com.leuname.lerguie.core.speech

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import com.leuname.lerguie.i18n.LanguagePacks
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

enum class ListenError { NO_PERMISSION, NETWORK, NOT_AVAILABLE, BUSY, OTHER }

data class ListenState(
    val listening: Boolean = false,
    val partial: String = "",
    val level: Float = 0f,
    val error: ListenError? = null,
)

/**
 * Fala para texto com o reconhecedor do próprio Android (sem chave de API).
 * Em modo contínuo reinicia sozinho após cada frase até o usuário parar.
 * Deve ser usado na thread principal e liberado com [release].
 */
class SpeechListener(private val context: Context, private val offlineOnly: () -> Boolean = { false }) {
    private val _state = MutableStateFlow(ListenState())
    val state: StateFlow<ListenState> = _state.asStateFlow()

    private var recognizer: SpeechRecognizer? = null
    private var continuous = false
    private var active = false
    private var onFinal: (String) -> Unit = {}

    val isAvailable: Boolean get() = SpeechRecognizer.isRecognitionAvailable(context)

    fun start(continuous: Boolean, onFinal: (String) -> Unit) {
        if (!isAvailable) {
            _state.update { it.copy(error = ListenError.NOT_AVAILABLE) }
            return
        }
        this.continuous = continuous
        this.onFinal = onFinal
        active = true
        _state.value = ListenState(listening = true)
        if (recognizer == null) {
            recognizer = SpeechRecognizer.createSpeechRecognizer(context).also { it.setRecognitionListener(listener) }
        }
        begin()
    }

    fun stop() {
        active = false
        recognizer?.stopListening()
        _state.update { it.copy(listening = false, level = 0f) }
    }

    fun release() {
        active = false
        recognizer?.destroy()
        recognizer = null
        _state.value = ListenState()
    }

    private fun begin() {
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, LanguagePacks.current().languageTag)
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
            if (offlineOnly()) putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
        }
        recognizer?.startListening(intent)
    }

    private val listener = object : RecognitionListener {
        override fun onReadyForSpeech(params: Bundle?) {
            _state.update { it.copy(listening = true, error = null) }
        }

        override fun onBeginningOfSpeech() = Unit

        override fun onRmsChanged(rmsdB: Float) {
            _state.update { it.copy(level = ((rmsdB + 2f) / 12f).coerceIn(0f, 1f)) }
        }

        override fun onBufferReceived(buffer: ByteArray?) = Unit
        override fun onEndOfSpeech() = Unit

        override fun onError(error: Int) {
            val silence = error == SpeechRecognizer.ERROR_NO_MATCH || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT
            if (active && continuous && silence) {
                begin()
                return
            }
            active = false
            val mapped = when (error) {
                SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> ListenError.NO_PERMISSION
                SpeechRecognizer.ERROR_NETWORK, SpeechRecognizer.ERROR_NETWORK_TIMEOUT,
                SpeechRecognizer.ERROR_SERVER -> ListenError.NETWORK
                SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> ListenError.BUSY
                SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT,
                SpeechRecognizer.ERROR_CLIENT -> null
                else -> ListenError.OTHER
            }
            _state.update { it.copy(listening = false, level = 0f, partial = "", error = mapped) }
        }

        override fun onResults(results: Bundle?) {
            val text = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull().orEmpty()
            _state.update { it.copy(partial = "") }
            if (text.isNotBlank()) onFinal(text.trim())
            if (active && continuous) begin() else {
                active = false
                _state.update { it.copy(listening = false, level = 0f) }
            }
        }

        override fun onPartialResults(partialResults: Bundle?) {
            val text = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull().orEmpty()
            _state.update { it.copy(partial = text) }
        }

        override fun onEvent(eventType: Int, params: Bundle?) = Unit
    }
}
