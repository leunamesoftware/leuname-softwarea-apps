package com.leuname.lerguie

import android.content.Context
import com.leuname.lerguie.ai.barcode.BarcodeReader
import com.leuname.lerguie.ai.barcode.ProductLookup
import com.leuname.lerguie.ai.libras.SignLanguagePresenter
import com.leuname.lerguie.ai.memory.ImageEmbedderEngine
import com.leuname.lerguie.ai.memory.ObjectMemory
import com.leuname.lerguie.ai.libras.SignLanguageRecognizer
import com.leuname.lerguie.ai.libras.UnavailableSignLanguagePresenter
import com.leuname.lerguie.ai.libras.UnavailableSignLanguageRecognizer
import com.leuname.lerguie.ai.ocr.TextReader
import com.leuname.lerguie.ai.vision.CloudSceneDescriber
import com.leuname.lerguie.ai.vision.HybridSceneDescriber
import com.leuname.lerguie.ai.vision.OnDeviceSceneDescriber
import com.leuname.lerguie.ai.vision.RealtimeDetector
import com.leuname.lerguie.core.billing.PlayBillingGateway
import com.leuname.lerguie.core.haptics.Haptics
import com.leuname.lerguie.core.network.Connectivity
import com.leuname.lerguie.core.network.LerguieApiClient
import com.leuname.lerguie.core.plans.EntitlementRepository
import com.leuname.lerguie.core.plans.Feature
import com.leuname.lerguie.core.settings.SettingsRepository
import com.leuname.lerguie.core.speech.Speaker
import com.leuname.lerguie.core.update.AppUpdater
import com.leuname.lerguie.core.voice.VoiceCommandBus
import com.leuname.lerguie.data.db.LerguieDatabase
import com.leuname.lerguie.data.history.HistoryRepository
import com.leuname.lerguie.ui.SessionStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Injeção de dependências manual: simples, sem framework extra.
 * Cada módulo de IA fica atrás de uma interface para poder ser trocado depois.
 */
class AppContainer(context: Context) {
    private val appContext = context.applicationContext
    val appScope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    val settings = SettingsRepository(appContext)
    val haptics = Haptics(appContext)
    val connectivity = Connectivity(appContext)
    val speaker = Speaker(appContext) { connectivity.isOnline() }
    val api = LerguieApiClient(appContext, BuildConfig.API_BASE_URL)

    private val database = LerguieDatabase.create(appContext)
    val history = HistoryRepository(appContext, database.historyDao(), settings)
    val memory = ObjectMemory(database.knownObjectDao(), ImageEmbedderEngine(appContext))

    // Planos/assinaturas: catálogo remoto + Google Play Billing (desligado até o catálogo ativar).
    val entitlements = EntitlementRepository(appContext, api, PlayBillingGateway(appContext), appScope)

    val realtimeDetector = RealtimeDetector(appContext)
    val sceneDescriber = HybridSceneDescriber(
        onDevice = OnDeviceSceneDescriber(realtimeDetector),
        cloud = CloudSceneDescriber(api),
        connectivity = connectivity,
        settings = settings,
        cloudConfigured = api.isConfigured,
        cloudAllowed = { entitlements.entitlements.value.canUse(Feature.CLOUD_DESCRIPTION) },
    )
    val textReader = TextReader()
    val barcodeReader = BarcodeReader()
    val productLookup = ProductLookup()

    // Libras: arquitetura pronta, reconhecimento real entra em versão futura (V2).
    val signRecognizer: SignLanguageRecognizer = UnavailableSignLanguageRecognizer()
    val signPresenter: SignLanguagePresenter = UnavailableSignLanguagePresenter()

    val session = SessionStore()
    val updater = AppUpdater(appContext)
    val voiceCommands = VoiceCommandBus()

    init {
        appScope.launch { if (connectivity.isOnline()) entitlements.refresh() }
        appScope.launch {
            settings.settings.collect { s ->
                haptics.enabled = s.vibration
                speaker.configure(rate = s.speechRate, pitch = s.speechPitch, voiceName = s.voiceName)
            }
        }
    }
}
