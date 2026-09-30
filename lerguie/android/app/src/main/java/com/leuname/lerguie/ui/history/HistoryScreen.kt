package com.leuname.lerguie.ui.history

import android.graphics.BitmapFactory
import android.text.format.DateUtils
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Checklist
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.DeleteSweep
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.QrCode
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.ViewList
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import com.leuname.lerguie.R
import com.leuname.lerguie.core.util.Sharing
import com.leuname.lerguie.data.db.HistoryCategory
import com.leuname.lerguie.data.db.HistoryEntity
import com.leuname.lerguie.ui.components.BigButton
import com.leuname.lerguie.ui.components.ButtonKind
import com.leuname.lerguie.ui.components.InfoBanner
import com.leuname.lerguie.ui.components.LerguieHeader
import com.leuname.lerguie.ui.components.ModeOption
import com.leuname.lerguie.ui.components.ModeSelector
import com.leuname.lerguie.ui.lerguieViewModel
import com.leuname.lerguie.ui.theme.LocalUiPrefs
import java.io.File

private const val ALL = "ALL"

fun categoryIcon(c: HistoryCategory): ImageVector = when (c) {
    HistoryCategory.DESCRIPTION -> Icons.Filled.CameraAlt
    HistoryCategory.READING -> Icons.Filled.Description
    HistoryCategory.SPEECH -> Icons.Filled.Mic
    HistoryCategory.CONVERSATION -> Icons.AutoMirrored.Filled.Chat
    HistoryCategory.BARCODE -> Icons.Filled.QrCode
}

fun categoryName(c: HistoryCategory): Int = when (c) {
    HistoryCategory.DESCRIPTION -> R.string.cat_description
    HistoryCategory.READING -> R.string.cat_reading
    HistoryCategory.SPEECH -> R.string.cat_speech
    HistoryCategory.CONVERSATION -> R.string.cat_conversation
    HistoryCategory.BARCODE -> R.string.cat_barcode
}

@Composable
fun HistoryScreen(nav: NavHostController, favoritesOnly: Boolean) {
    val vm = lerguieViewModel { HistoryViewModel(it, favoritesOnly) }
    val filter by vm.filter.collectAsStateWithLifecycle()
    val items by vm.items.collectAsStateWithLifecycle()
    val selected by vm.selected.collectAsStateWithLifecycle()
    val saveEnabled by vm.saveHistoryEnabled.collectAsStateWithLifecycle()
    var selectionMode by remember { mutableStateOf(false) }
    var confirmAll by remember { mutableStateOf(false) }
    val context = LocalContext.current
    val shareTitle = stringResource(R.string.share)

    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        LerguieHeader(onBack = { nav.popBackStack() })
        Column(Modifier.padding(horizontal = 16.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                stringResource(if (filter.favoritesOnly) R.string.tab_favorites else R.string.tab_history),
                style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.onBackground,
            )
            OutlinedTextField(
                value = filter.query, onValueChange = vm::setQuery, singleLine = true,
                leadingIcon = { Icon(Icons.Filled.Search, null) },
                label = { Text(stringResource(R.string.history_search)) },
                modifier = Modifier.fillMaxWidth(),
            )
        }
        val options = listOf(ModeOption(ALL, stringResource(R.string.cat_all), Icons.Filled.ViewList)) +
            HistoryCategory.entries.map { ModeOption(it.name, stringResource(categoryName(it)), categoryIcon(it)) }
        ModeSelector(options, filter.category?.name ?: ALL, { v -> vm.setCategory(if (v == ALL) null else HistoryCategory.valueOf(v)) })

        Row(Modifier.padding(horizontal = 16.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            if (selectionMode) {
                BigButton(stringResource(R.string.delete_selected, selected.size), Icons.Filled.Delete,
                    { vm.delete(selected); selectionMode = false }, Modifier.weight(1f), ButtonKind.PRIMARY, enabled = selected.isNotEmpty())
                BigButton(stringResource(R.string.cancel), Icons.Filled.Close, { vm.clearSelection(); selectionMode = false }, Modifier.weight(1f), ButtonKind.TONAL)
            } else {
                BigButton(stringResource(R.string.select), Icons.Filled.Checklist, { selectionMode = true }, Modifier.weight(1f), ButtonKind.TONAL, enabled = items.isNotEmpty())
                BigButton(stringResource(R.string.delete_all_short), Icons.Filled.DeleteSweep, { confirmAll = true }, Modifier.weight(1f), ButtonKind.TONAL, enabled = items.isNotEmpty())
            }
        }

        if (!saveEnabled && !filter.favoritesOnly) InfoBanner(stringResource(R.string.history_disabled_info), Modifier.padding(horizontal = 16.dp))

        if (items.isEmpty()) {
            Text(
                stringResource(R.string.history_empty), style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.padding(24.dp),
            )
        }
        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.fillMaxSize(),
        ) {
            items(items, key = { it.id }) { item ->
                HistoryRow(
                    item = item,
                    selectionMode = selectionMode,
                    selected = item.id in selected,
                    onToggleSelect = { vm.toggleSelect(item.id) },
                    onPlay = { vm.speak(item) },
                    onFavorite = { vm.toggleFavorite(item) },
                    onShare = { Sharing.shareText(context, item.content, shareTitle) },
                    onDelete = { vm.delete(listOf(item.id)) },
                )
            }
        }
    }

    if (confirmAll) {
        AlertDialog(
            onDismissRequest = { confirmAll = false },
            title = { Text(stringResource(R.string.delete_all_history)) },
            text = { Text(stringResource(R.string.delete_all_confirm)) },
            confirmButton = { TextButton(onClick = { confirmAll = false; vm.deleteAll() }) { Text(stringResource(R.string.delete)) } },
            dismissButton = { TextButton(onClick = { confirmAll = false }) { Text(stringResource(R.string.cancel)) } },
        )
    }
}

@Composable
private fun HistoryRow(
    item: HistoryEntity,
    selectionMode: Boolean,
    selected: Boolean,
    onToggleSelect: () -> Unit,
    onPlay: () -> Unit,
    onFavorite: () -> Unit,
    onShare: () -> Unit,
    onDelete: () -> Unit,
) {
    val category = runCatching { HistoryCategory.valueOf(item.category) }.getOrDefault(HistoryCategory.READING)
    val when_ = DateUtils.getRelativeTimeSpanString(item.createdAt, System.currentTimeMillis(), DateUtils.MINUTE_IN_MILLIS).toString()
    val thumb = remember(item.imagePath) {
        item.imagePath?.let { p -> runCatching { BitmapFactory.decodeFile(File(p).path)?.asImageBitmap() }.getOrNull() }
    }
    val btn = LocalUiPrefs.current.iconButtonSize
    Surface(
        shape = RoundedCornerShape(18.dp),
        color = MaterialTheme.colorScheme.surface,
        modifier = Modifier.fillMaxWidth().then(
            if (selected) Modifier.border(3.dp, MaterialTheme.colorScheme.secondary, RoundedCornerShape(18.dp)) else Modifier
        ),
    ) {
        Column(Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (selectionMode) {
                    Checkbox(checked = selected, onCheckedChange = { onToggleSelect() })
                }
                Box(Modifier.size(56.dp).background(MaterialTheme.colorScheme.primaryContainer, RoundedCornerShape(12.dp)), contentAlignment = Alignment.Center) {
                    if (thumb != null) {
                        Image(thumb, null, contentScale = ContentScale.Crop, modifier = Modifier.size(56.dp))
                    } else {
                        Icon(categoryIcon(category), null, tint = MaterialTheme.colorScheme.onPrimaryContainer)
                    }
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f).semantics(mergeDescendants = true) {}) {
                    Text(stringResource(categoryName(category)), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.secondary)
                    Text("“${item.title}”", style = MaterialTheme.typography.titleMedium, maxLines = 2, overflow = TextOverflow.Ellipsis)
                    Text(when_, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            if (!selectionMode) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                    IconButton(onClick = onPlay, modifier = Modifier.size(btn)) { Icon(Icons.Filled.PlayArrow, stringResource(R.string.play)) }
                    IconButton(onClick = onFavorite, modifier = Modifier.size(btn)) {
                        Icon(
                            if (item.favorite) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                            stringResource(if (item.favorite) R.string.unfavorite else R.string.favorite),
                            tint = MaterialTheme.colorScheme.secondary,
                        )
                    }
                    IconButton(onClick = onShare, modifier = Modifier.size(btn)) { Icon(Icons.Filled.Share, stringResource(R.string.share)) }
                    IconButton(onClick = onDelete, modifier = Modifier.size(btn)) { Icon(Icons.Filled.Delete, stringResource(R.string.delete)) }
                }
            }
        }
    }
}
