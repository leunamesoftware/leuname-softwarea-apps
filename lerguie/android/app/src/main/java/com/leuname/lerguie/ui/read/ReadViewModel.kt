package com.leuname.lerguie.ui.read

import android.graphics.Bitmap
import androidx.annotation.OptIn
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageProxy
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.mlkit.vision.common.InputImage
import com.leuname.lerguie.AppContainer
import com.leuname.lerguie.ai.ocr.FramingHint
import com.leuname.lerguie.ai.ocr.OcrResult
import com.leuname.lerguie.ai.ocr.ReadMode
import com.leuname.lerguie.core.haptics.HapticEvent
import com.leuname.lerguie.data.db.HistoryCategory
import com.leuname.lerguie.ui.ReadSession
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ReadUiState(
    val mode: ReadMode = ReadMode.TEXT,
    val busy: Boolean = false,
    val torch: Boolean = false,
    val hint: FramingHint? = null,
    val error: Boolean = false,
)

class ReadViewModel(private val c: AppContainer, initialMode: ReadMode) : ViewModel() {
    private val _state = MutableStateFlow(ReadUiState(mode = initialMode))
    val state: StateFlow<ReadUiState> = _state.asStateFlow()

    private val _resultReady = Channel<Unit>(Channel.CONFLATED)
    val resultReady = _resultReady.receiveAsFlow()

    @Volatile private var analyzing = false
    @Volatile private var lastAt = 0L

    fun setMode(mode: ReadMode) = _state.update { it.copy(mode = mode, hint = null) }
    fun setTorch(on: Boolean) = _state.update { it.copy(torch = on) }

    fun capture(bitmap: Bitmap) {
        if (_state.value.busy) return
        c.haptics.play(HapticEvent.CAPTURE)
        c.speaker.stop()
        _state.update { it.copy(busy = true, error = false) }
        viewModelScope.launch {
            val mode = _state.value.mode
            val session = if (mode == ReadMode.BARCODE) {
                val code = c.barcodeReader.read(bitmap)
                val product = if (code?.isProduct == true && c.connectivity.isOnline()) c.productLookup.lookup(code.value) else null
                ReadSession(bitmap, mode, ocr = null, barcode = code, productName = product)
            } else {
                ReadSession(bitmap, mode, ocr = c.textReader.read(bitmap))
            }
            val text = session.ocr.let { if (it is OcrResult.Success) it.fullText else null }
                ?: session.barcode?.let { listOfNotNull(session.productName, it.value).joinToString(" — ") }
            if (text != null) {
                val category = if (mode == ReadMode.BARCODE) HistoryCategory.BARCODE else HistoryCategory.READING
                session.historyId = c.history.recordIfAllowed(category, text.lineSequence().first().take(80), text, bitmap)
                c.haptics.play(HapticEvent.SUCCESS)
            } else {
                c.haptics.play(HapticEvent.ERROR)
            }
            c.session.read = session
            _state.update { it.copy(busy = false) }
            _resultReady.trySend(Unit)
        }
    }

    fun captureFailed() {
        c.haptics.play(HapticEvent.ERROR)
        _state.update { it.copy(busy = false, error = true) }
    }

    /** Orientação de enquadramento: OCR leve a cada ~1,2 s; fala só quando a dica muda. */
    @OptIn(ExperimentalGetImage::class)
    fun onFrame(proxy: ImageProxy, speak: (FramingHint) -> Unit) {
        val now = System.currentTimeMillis()
        val media = proxy.image
        if (_state.value.busy || _state.value.mode == ReadMode.BARCODE || analyzing || now - lastAt < 1200 || media == null) {
            proxy.close()
            return
        }
        analyzing = true
        lastAt = now
        val input = InputImage.fromMediaImage(media, proxy.imageInfo.rotationDegrees)
        viewModelScope.launch {
            try {
                val hint = runCatching { c.textReader.framing(input) }.getOrNull()
                if (hint != null && hint != _state.value.hint) {
                    _state.update { it.copy(hint = hint) }
                    if (hint == FramingHint.GOOD) c.haptics.play(HapticEvent.CONFIRM)
                    speak(hint)
                }
            } finally {
                proxy.close()
                analyzing = false
            }
        }
    }
}
