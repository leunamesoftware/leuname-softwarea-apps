package com.leuname.lerguie.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import com.leuname.lerguie.R
import com.leuname.lerguie.ui.theme.LocalBrand
import com.leuname.lerguie.ui.theme.LocalUiPrefs

/** Marca "Lerguie" com o final "uie" em laranja + slogan. */
@Composable
fun Wordmark(big: Boolean, modifier: Modifier = Modifier) {
    val brand = LocalBrand.current
    Column(modifier.semantics(mergeDescendants = true) {}) {
        Text(
            text = buildAnnotatedString {
                withStyle(SpanStyle(color = brand.onHeader)) { append("Lerg") }
                withStyle(SpanStyle(color = brand.accent)) { append("uie") }
            },
            style = if (big) MaterialTheme.typography.displaySmall else MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.ExtraBold,
        )
        Text(
            text = stringResource(R.string.slogan),
            color = brand.onHeader,
            style = if (big) MaterialTheme.typography.titleMedium else MaterialTheme.typography.labelMedium,
        )
    }
}

@Composable
fun LerguieHeader(
    onBack: (() -> Unit)? = null,
    big: Boolean = false,
    actions: @Composable RowScope.() -> Unit = {},
) {
    val brand = LocalBrand.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(brand.header)
            .statusBarsPadding()
            .padding(horizontal = 8.dp, vertical = if (big) 16.dp else 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (onBack != null) {
            IconButton(onClick = onBack, modifier = Modifier.size(LocalUiPrefs.current.iconButtonSize)) {
                Icon(
                    Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = stringResource(R.string.back),
                    tint = brand.onHeader,
                )
            }
        } else {
            Spacer(Modifier.width(8.dp))
        }
        Image(
            painter = painterResource(R.drawable.lerguie_logo),
            contentDescription = null,
            modifier = Modifier
                .size(if (big) 72.dp else 40.dp)
                .clip(RoundedCornerShape(if (big) 18.dp else 10.dp)),
        )
        Spacer(Modifier.width(10.dp))
        Wordmark(big = big, modifier = Modifier.weight(1f).semantics { heading() })
        Row(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically, content = actions)
    }
}

/** Ícone de ação no cabeçalho com nome acessível. */
@Composable
fun HeaderAction(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, onClick: () -> Unit) {
    IconButton(onClick = onClick, modifier = Modifier.size(LocalUiPrefs.current.iconButtonSize)) {
        Icon(icon, contentDescription = label, tint = LocalBrand.current.onHeader)
    }
}
