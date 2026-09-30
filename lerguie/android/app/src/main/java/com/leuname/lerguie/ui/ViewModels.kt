package com.leuname.lerguie.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.leuname.lerguie.AppContainer
import com.leuname.lerguie.LerguieApp

@Composable
fun appContainer(): AppContainer = (LocalContext.current.applicationContext as LerguieApp).container

/** Cria ViewModels com as dependências do AppContainer (sem framework de DI). */
@Composable
inline fun <reified VM : ViewModel> lerguieViewModel(crossinline create: (AppContainer) -> VM): VM {
    val container = appContainer()
    return viewModel(factory = viewModelFactory { initializer { create(container) } })
}
