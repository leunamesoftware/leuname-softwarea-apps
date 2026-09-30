package com.leuname.lerguie.ui.see

import android.graphics.Bitmap
import androidx.camera.core.ImageProxy
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.leuname.lerguie.AppContainer
import com.leuname.lerguie.ai.vision.SceneSpeech
import com.leuname.lerguie.ai.vision.VisionMode
import com.leuname.lerguie.ai.vision.VisionResult
import com.leuname.lerguie.core.haptics.HapticEvent
import com.leuname.lerguie.core.util.Bitmaps
import com.leuname.lerguie.data.db.HistoryCategory
import com.leuname.lerguie.i18n.LanguagePacks
import com.leuname.lerguie.ui.SeeSession
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class SeeUiState(
    val mode: VisionMode = VisionMode.OBJECT,
    val autoDescribe: Boolean = false,
    val busy: Boolean = false,
    val torch: Boolean = false,
    val lastAuto: String? = null,
    val error: Boolean = false,
)

class SeeViewModel(private val c: AppContainer) : ViewModel() {
    private val _state = MutableStateFlow(SeeUiState())
    val state: StateFlow<SeeUiState> = _state.asStateFlow()

    private val _resultReady = Channel<Unit>(Channel.CONFLATED)
    val resultReady = _resultReady.receiveAsFlow()

    @Volatile private var analyzing = false
    @Volatile private var lastAnalysisAt = 0L

    fun setMode(mode: VisionMode) = _state.update { it.copy(mode = mode) }
    fun setTorch(on: Boolean) = _state.update { it.copy(torch = on) }

    fun setAutoDescribe(on: Boolean) {
        _state.update { it.copy(autoDescribe = on, lastAuto = null) }
        if (!on) c.speaker.stop()
    }

    /** Foto (câmera ou galeria): análise completa (nuvem quando permitido) e abre o resultado. */
    fun analyze(bitmap: Bitmap) {
        if (_state.value.busy) return
        c.haptics.play(HapticEvent.CAPTURE)
        _state.update { it.copy(busy = true, error = false) }
        viewModelScope.launch {
            val mode = _state.value.mode
            val result = c.sceneDescriber.describe(bitmap, mode)
            val session = SeeSession(bitmap, mode, result)
            if (result is VisionResult.Success) {
                val text = SceneSpeech.compose(result.scene)
                session.historyId = c.history.recordIfAllowed(HistoryCategory.DESCRIPTION, SceneSpeech.headline(result.scene), text, bitmap)
                c.haptics.play(if (result.scene.hazards.isNotEmpty()) HapticEvent.ALERT else HapticEvent.SUCCESS)
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
     * Descrição automática: só no aparelho (sem custo, offline), no intervalo escolhido,
     * e fala apenas quando algo muda — economiza bateria e não repete a mesma frase.
     */
    fun onFrame(proxy: ImageProxy, intervalSec: Int) {
        val now = System.currentTimeMillis()
        val s = _state.value
        if (!s.autoDescribe || s.busy || analyzing || now - lastAnalysisAt < intervalSec * 1000L) {
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
                val result = c.sceneDescriber.onDevice.describe(bitmap, _state.value.mode)
                if (result is VisionResult.Success && _state.value.autoDescribe) {
                    val pack = LanguagePacks.current()
                    val scene = result.scene
                    val short = buildList {
                        if (scene.hazards.isNotEmpty()) add(pack.attention(scene.hazards))
                        add(SceneSpeech.headline(scene, pack))
                    }.joinToString(" ")
                    if (short != _state.value.lastAuto) {
                        _state.update { it.copy(lastAuto = short) }
                        c.haptics.play(if (scene.hazards.isNotEmpty()) HapticEvent.ALERT else HapticEvent.CONFIRM)
                        c.speaker.speak(short, "auto")
                        c.session.lastSpoken = short
                    }
                }
            } finally {
                analyzing = false
            }
        }
    }
}
