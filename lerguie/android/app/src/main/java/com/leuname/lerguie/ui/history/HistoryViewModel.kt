package com.leuname.lerguie.ui.history

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.leuname.lerguie.AppContainer
import com.leuname.lerguie.data.db.HistoryCategory
import com.leuname.lerguie.data.db.HistoryEntity
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class HistoryFilter(val category: HistoryCategory? = null, val favoritesOnly: Boolean = false, val query: String = "")

class HistoryViewModel(private val c: AppContainer, favoritesOnly: Boolean) : ViewModel() {
    val filter = MutableStateFlow(HistoryFilter(favoritesOnly = favoritesOnly))
    val selected = MutableStateFlow<Set<Long>>(emptySet())

    @OptIn(ExperimentalCoroutinesApi::class)
    val items: StateFlow<List<HistoryEntity>> = filter
        .flatMapLatest { f -> c.history.observe(f.category, f.favoritesOnly, f.query) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val saveHistoryEnabled = c.settings.settings
        .combine(filter) { s, _ -> s.saveHistory }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), true)

    fun setCategory(cat: HistoryCategory?) = filter.update { it.copy(category = cat) }
    fun setFavoritesOnly(on: Boolean) = filter.update { it.copy(favoritesOnly = on) }
    fun setQuery(q: String) = filter.update { it.copy(query = q) }

    fun toggleSelect(id: Long) = selected.update { if (id in it) it - id else it + id }
    fun clearSelection() { selected.value = emptySet() }

    fun toggleFavorite(item: HistoryEntity) = viewModelScope.launch { c.history.setFavorite(item.id, !item.favorite) }
    fun delete(ids: Collection<Long>) = viewModelScope.launch {
        c.history.delete(ids.toList())
        selected.update { it - ids.toSet() }
    }
    fun deleteAll() = viewModelScope.launch { c.history.deleteAll(); clearSelection() }
    fun speak(item: HistoryEntity) {
        c.speaker.speak(item.content, "h${item.id}")
        c.session.lastSpoken = item.content
    }
}
