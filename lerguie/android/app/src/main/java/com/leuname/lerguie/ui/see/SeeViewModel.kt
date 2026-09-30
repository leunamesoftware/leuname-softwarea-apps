package com.leuname.lerguie.ui.see

import android.graphics.Bitmap
import androidx.camera.core.ImageProxy
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.leuname.lerguie.AppContainer
import com.leuname.lerguie.ai.vision.OnDeviceComposer
import com.leuname.lerguie.ai.vision.SceneSpeech
import com.leuname.lerguie.ai.vision.VisionMode
import com.leuname.lerguie.ai.vision.VisionResult
import com.leuname.lerguie.ai.vision.WalkAnnouncer
import com.leuname.lerguie.core.haptics.HapticEvent
import com.leuname.lerguie.core.util.Bitmaps
import com.leuname.lerguie.core.voice.VoiceCommandParser
import com.leuname.lerguie.data.db.HistoryCategory
import com.leuname.lerguie.i18n.LanguagePacks
import com.leuname.lerguie.ui.SeeSession
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.async
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class SeeUiState(
    val mode: VisionMode = VisionMode.OBJECT,
    val autoDescribe: Boolean = false,
    val busy: Boolean = false,
    val torch: Boolean = false,
    val lastAuto: String? = null,
    val error: Boolean = false,
    /** O que a pessoa pediu para procurar por voz (ex.: "leite"). */
    val find: String? = null,
) {
    /** No modo Caminhar a análise contínua está sempre ligada. */
    val continuous: Boolean get() = autoDescribe || mode == VisionMode.WALK
}

class SeeViewModel(private val c: AppContainer) : ViewModel() {
    private val _state = MutableStateFlow(SeeUiState())
    val state: StateFlow<SeeUiState> = _state.asStateFlow()

    private val _resultReady = Channel<Unit>(Channel.CONFLATED)
    val resultReady = _resultReady.receiveAsFlow()

    private val walk = WalkAnnouncer()

    init {
        // Para quem não enxerga: ao abrir a câmera, já começa a descrever sozinho.
        viewModelScope.launch {
            if (c.settings.current().usageType == com.leuname.lerguie.core.settings.UsageType.BLIND_LOW_VISION &&
                _state.value.find == null
            ) _state.update { it.copy(autoDescribe = true) }
        }
    }
    @Volatile private var analyzing = false
    @Volatile private var lastAnalysisAt = 0L
    @Volatile private var cloudBusy = false
    @Volatile private var lastCloudAt = 0L
    @Volatile private var lastCloudText: String? = null
    @Volatile private var lastKnownAt = 0L
    @Volatile private var lastKnownName: String? = null
    @Volatile private var lastKnownSpokenAt = 0L
    @Volatile private var lastFoundAt = 0L

    fun setMode(mode: VisionMode) {
        walk.reset()
        lastCloudText = null
        _state.update { it.copy(mode = mode, lastAuto = null, find = if (mode == VisionMode.WALK) it.find else null) }
        if (mode != VisionMode.WALK && !_state.value.autoDescribe) c.speaker.stop()
    }

    /** Modo procurar: Caminhar + IA focada no item pedido. */
    fun setFind(item: String) {
        if (item.isBlank() || _state.value.find == item) return
        walk.reset()
        lastCloudText = null
        lastCloudAt = 0L
        _state.update { it.copy(find = item, mode = VisionMode.WALK, lastAuto = null) }
        c.speaker.speak(LanguagePacks.current().findingStart(item), "walk")
    }

    fun setTorch(on: Boolean) = _state.update { it.copy(torch = on) }

    fun setAutoDescribe(on: Boolean) {
        _state.update { it.copy(autoDescribe = on, lastAuto = null) }
        if (!on) c.speaker.stop()
    }

    /** Foto (câmera ou galeria): análise completa (nuvem quando permitido) e abre o resultado. */
    fun analyze(bitmap: Bitmap) {
        if (_state.value.busy) return
        c.haptics.play(HapticEvent.CAPTURE)
        c.speaker.stop()
        _state.update { it.copy(busy = true, error = false) }
        viewModelScope.launch {
            val mode = _state.value.mode.let { if (it == VisionMode.WALK) VisionMode.ENVIRONMENT else it }
            val known = async { c.memory.recognize(bitmap) }
            val written = async { c.textReader.read(bitmap) }
            val result = c.sceneDescriber.describe(bitmap, mode)
            val text = (written.await() as? com.leuname.lerguie.ai.ocr.OcrResult.Success)?.fullText
                ?.replace(Regex("\\s+"), " ")?.trim()?.takeIf { it.length >= 3 }
            val session = SeeSession(bitmap, mode, result, known.await(), text)
            if (result is VisionResult.Success || session.known != null) {
                val pack = LanguagePacks.current()
                val text = session.spokenText(pack, "")
                val title = session.known?.name ?: (result as VisionResult.Success).scene.let { SceneSpeech.headline(it, pack) }
                session.historyId = c.history.recordIfAllowed(HistoryCategory.DESCRIPTION, title, text, bitmap)
                val alert = (result as? VisionResult.Success)?.scene?.hazards?.isNotEmpty() == true
                c.haptics.play(if (alert) HapticEvent.ALERT else HapticEvent.SUCCESS)
            } else {
                c.haptics.play(HapticEvent.ERROR)
            }
            c.session.see = session
            _state.update { it.copy(busy = false) }
            _resultReady.trySend(Unit)
        }
    }

    fun captureFailed() {
        c.haptics.play(HapticEvent.ERROR)
        _state.update { it.copy(busy = false, error = true) }
    }

    /**
     * Análise contínua.
     * - Caminhar: detector local ~2 vezes por segundo (carros, motos, bicicletas, pessoas…)
     *   + descrição da nuvem do caminho (portas, paredes, escadas) no intervalo escolhido.
     * - Descrição automática: análise local no intervalo escolhido, fala só quando muda.
     */
    fun onFrame(proxy: ImageProxy, intervalSec: Int) {
        val now = System.currentTimeMillis()
        val s = _state.value
        val walking = s.mode == VisionMode.WALK
        val minGap = if (walking) 500L else intervalSec * 1000L
        if (!s.continuous || s.busy || analyzing || now - lastAnalysisAt < minGap) {
            proxy.close()
            return
        }
        analyzing = true
        lastAnalysisAt = now
        val bitmap = try {
            Bitmaps.rotate(Bitmaps.scaleDown(proxy.toBitmap(), 640), proxy.imageInfo.rotationDegrees)
        } catch (e: Exception) {
            null
        } finally {
            proxy.close()
        }
        if (bitmap == null) {
            analyzing = false
            return
        }
        viewModelScope.launch {
            try {
                if (walking) walkStep(bitmap, now, intervalSec) else autoStep(bitmap)
            } finally {
                analyzing = false
            }
        }
    }

    private suspend fun walkStep(bitmap: Bitmap, now: Long, intervalSec: Int) {
        val pack = LanguagePacks.current()
        val detections = withContext(Dispatchers.Default) { c.realtimeDetector.detect(bitmap) }
        val find = _state.value.find
        // Procurar: se o item é uma das classes do detector (ex.: garrafa, cadeira), avisa já no aparelho.
        if (find != null) {
            val wanted = VoiceCommandParser.normalize(find)
            detections.filter { d -> pack.cocoLabels[d.label]?.let { VoiceCommandParser.normalize(it.name) == wanted } == true }
                .maxByOrNull { it.score }?.let { d ->
                    if (now - lastFoundAt > 4000) {
                        lastFoundAt = now
                        val term = pack.cocoLabels.getValue(d.label)
                        val t = pack.found(pack.walkItem(term, pack.position(OnDeviceComposer.position(d.box)), OnDeviceComposer.proximity(d.box)))
                        c.haptics.play(HapticEvent.SUCCESS)
                        c.speaker.speak(t, "walk")
                        _state.update { it.copy(lastAuto = t) }
                    }
                }
        }
        val items = walk.next(detections, pack, now)
        items.forEach { a ->
            if (a.alert) {
                c.haptics.play(HapticEvent.ALERT)
                c.speaker.speak(a.text, "walk")
            } else {
                c.speaker.speakQueued(a.text, "walk")
            }
        }
        // Objetos ensinados (ex.: "Remédio da pressão à sua frente"), a cada ~1,5 s.
        if (now - lastKnownAt >= 1500) {
            lastKnownAt = now
            val known = c.memory.recognize(bitmap)
            if (known != null && (known.name != lastKnownName || now - lastKnownSpokenAt > 10_000)) {
                lastKnownName = known.name
                lastKnownSpokenAt = now
                val t = if (known.level == com.leuname.lerguie.ai.memory.MatchLevel.SURE) pack.knownWalk(known.name) else pack.knownLikely(known.name)
                c.haptics.play(HapticEvent.MESSAGE)
                c.speaker.speakQueued(t, "walk")
                _state.update { it.copy(lastAuto = t) }
            }
        }
        if (items.isNotEmpty()) {
            val text = items.joinToString(" ") { it.text }
            _state.update { it.copy(lastAuto = text) }
            c.session.lastSpoken = text
        }
        // Visão geral do caminho pela IA (quando há internet), em paralelo e sem travar o local.
        // Nuvem com cota diária gratuita: consultas espaçadas.
        val cloudGap = if (find != null) 5000L else maxOf(20, intervalSec) * 1000L
        // Cota gratuita da nuvem é compartilhada por todos: no Caminhar só consulta ao procurar um item.
        if (find != null && !cloudBusy && now - lastCloudAt >= cloudGap) {
            cloudBusy = true
            lastCloudAt = now
            viewModelScope.launch {
                try {
                    val r = c.sceneDescriber.describeCloudOnly(bitmap, VisionMode.WALK, find)
                    if (r is VisionResult.Success && _state.value.mode == VisionMode.WALK) {
                        val scene = r.scene
                        val text = buildList {
                            if (scene.hazards.isNotEmpty()) add(pack.attention(scene.hazards))
                            add(SceneSpeech.headline(scene, pack))
                        }.joinToString(" ")
                        if (text != lastCloudText) {
                            lastCloudText = text
                            if (scene.hazards.isNotEmpty()) {
                                c.haptics.play(HapticEvent.ALERT)
                                c.speaker.speak(text, "walk")
                            } else {
                                c.speaker.speakQueued(text, "walk")
                            }
                            _state.update { it.copy(lastAuto = text) }
                        }
                    }
                } finally {
                    cloudBusy = false
                }
            }
        }
    }

    private suspend fun autoStep(bitmap: Bitmap) {
        val result = c.sceneDescriber.onDevice.describe(bitmap, _state.value.mode)
        val known = c.memory.recognize(bitmap)
        // Lê também o que estiver escrito (placas, avisos, rótulos) — só na hora, nada é guardado.
        val written = (c.textReader.read(bitmap) as? com.leuname.lerguie.ai.ocr.OcrResult.Success)?.fullText
            ?.replace(Regex("\\s+"), " ")?.trim()?.takeIf { it.length >= 3 }?.take(160)
        if ((result is VisionResult.Success || known != null || written != null) && _state.value.continuous) {
            val pack = LanguagePacks.current()
            val scene = (result as? VisionResult.Success)?.scene
            val short = buildList {
                if (scene != null && scene.hazards.isNotEmpty()) add(pack.attention(scene.hazards))
                if (known != null) add(pack.knownWalk(known.name))
                else if (scene != null) add(SceneSpeech.headline(scene, pack))
                if (written != null) add(pack.writtenText(written))
            }.joinToString(" ")
            if (short != _state.value.lastAuto) {
                _state.update { it.copy(lastAuto = short) }
                c.haptics.play(if (scene?.hazards?.isNotEmpty() == true) HapticEvent.ALERT else HapticEvent.CONFIRM)
                c.speaker.speak(short, "auto")
                c.session.lastSpoken = short
            }
        }
    }
}
