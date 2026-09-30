package com.leuname.lerguie.ui.communicate

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.leuname.lerguie.AppContainer
import com.leuname.lerguie.core.haptics.HapticEvent
import com.leuname.lerguie.data.db.HistoryCategory
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class Party { ME, OTHER }

data class ConversationMessage(val from: Party, val text: String, val at: Long = System.currentTimeMillis())

data class CommunicateUiState(
    val draft: String = "",
    val messages: List<ConversationMessage> = emptyList(),
    val saved: Boolean = false,
) {
    val lastReply: String? get() = messages.lastOrNull { it.from == Party.OTHER }?.text
}

/** Gerencia a conversa bidirecional (módulo de conversação). Nada é salvo sem ação do usuário. */
class CommunicateViewModel(private val c: AppContainer) : ViewModel() {
    private val _state = MutableStateFlow(CommunicateUiState())
    val state: StateFlow<CommunicateUiState> = _state.asStateFlow()
    private var historyId: Long? = null

    fun setDraft(text: String) = _state.update { it.copy(draft = text) }

    /** Fala em voz alta a mensagem do usuário para a outra pessoa. */
    fun speakMine(text: String = _state.value.draft) {
        val t = text.trim()
        if (t.isEmpty()) return
        c.speaker.speak(t, "mine")
        c.session.lastSpoken = t
        c.haptics.play(HapticEvent.CONFIRM)
        _state.update { it.copy(draft = "", messages = it.messages + ConversationMessage(Party.ME, t), saved = false) }
    }

    fun addReply(text: String, speakAloud: Boolean) {
        c.haptics.play(HapticEvent.MESSAGE)
        _state.update { it.copy(messages = it.messages + ConversationMessage(Party.OTHER, text), saved = false) }
        if (speakAloud) c.speaker.speak(text, "reply")
        c.session.lastSpoken = text
    }

    fun repeatReply(slower: Boolean) {
        val r = _state.value.lastReply ?: return
        if (slower) c.speaker.speakWithRate(r, 0.7f, "reply") else c.speaker.speak(r, "reply")
    }

    fun transcript(me: String, other: String): String =
        _state.value.messages.joinToString("\n") { "${if (it.from == Party.ME) me else other}: ${it.text}" }

    fun save(me: String, other: String) {
        val msgs = _state.value.messages
        if (msgs.isEmpty()) return
        viewModelScope.launch {
            historyId = c.history.saveFavorite(historyId, HistoryCategory.CONVERSATION, msgs.first().text.take(80), transcript(me, other))
            c.haptics.play(HapticEvent.SUCCESS)
            _state.update { it.copy(saved = true) }
        }
    }

    fun clear() {
        historyId = null
        _state.value = CommunicateUiState()
    }
}
