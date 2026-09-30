package com.leuname.lerguie.ai.libras

import android.graphics.Bitmap

/**
 * Módulo de Libras — contrato para as próximas versões.
 *
 * Reconhecer Libras exige um modelo treinado com vídeos de sinais (mãos, expressão facial
 * e movimento). Enquanto não houver um modelo com confiabilidade comprovada, o app NÃO
 * finge reconhecer sinais: a implementação atual informa que o recurso não está disponível.
 *
 * Para plugar um modelo real (V2): implemente [SignLanguageRecognizer] (ex.: MediaPipe
 * Holistic/Hand Landmarker + classificador de sequências) e troque no AppContainer.
 */
enum class ModuleStatus { AVAILABLE, NOT_AVAILABLE }

sealed interface SignResult {
    data class Recognized(val text: String, val confidence: Float) : SignResult
    /** Reconheceu algo, mas sem segurança: pedir para repetir. */
    data object LowConfidence : SignResult
    data object Unavailable : SignResult
}

interface SignLanguageRecognizer {
    val status: ModuleStatus
    /** Recebe uma sequência de quadros (ex.: 1–3 s de vídeo) e devolve o texto reconhecido. */
    suspend fun recognize(frames: List<Bitmap>): SignResult
}

/** Representação visual da resposta em Libras (avatar, animação ou vídeos de sinais). */
sealed interface SignPresentation {
    data class Glosses(val glosses: List<String>) : SignPresentation
    data object Unavailable : SignPresentation
}

interface SignLanguagePresenter {
    val status: ModuleStatus
    suspend fun present(text: String): SignPresentation
}

class UnavailableSignLanguageRecognizer : SignLanguageRecognizer {
    override val status = ModuleStatus.NOT_AVAILABLE
    override suspend fun recognize(frames: List<Bitmap>): SignResult = SignResult.Unavailable
}

class UnavailableSignLanguagePresenter : SignLanguagePresenter {
    override val status = ModuleStatus.NOT_AVAILABLE
    override suspend fun present(text: String): SignPresentation = SignPresentation.Unavailable
}
