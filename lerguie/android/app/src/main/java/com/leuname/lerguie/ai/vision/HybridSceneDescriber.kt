package com.leuname.lerguie.ai.vision

import kotlinx.coroutines.CancellationException
import android.graphics.Bitmap
import com.leuname.lerguie.core.network.Connectivity
import com.leuname.lerguie.core.network.QuotaExceededException
import com.leuname.lerguie.core.settings.SettingsRepository

/**
 * Usa a IA da nuvem quando permitido e disponível; caso contrário (ou em falha)
 * cai para a análise no aparelho e avisa o usuário que a descrição é simplificada.
 */
class HybridSceneDescriber(
    val onDevice: SceneDescriber,
    private val cloud: CloudSceneDescriber,
    private val connectivity: Connectivity,
    private val settings: SettingsRepository,
    private val cloudConfigured: Boolean,
    private val cloudAllowed: () -> Boolean,
) : SceneDescriber {

    override suspend fun describe(image: Bitmap, mode: VisionMode): VisionResult {
        if (!settings.current().useCloudAi || !cloudConfigured) return onDevice.describe(image, mode)
        if (!cloudAllowed()) return onDevice.describe(image, mode).withNotice(VisionNotice.QUOTA_SIMPLIFIED)
        if (!connectivity.isOnline()) return onDevice.describe(image, mode).withNotice(VisionNotice.OFFLINE_SIMPLIFIED)
        return try {
            cloud.describe(image, mode)
        } catch (e: CancellationException) {
            throw e
        } catch (e: QuotaExceededException) {
            // Limite do plano: nunca bloqueia a função, apenas usa a análise do aparelho.
            onDevice.describe(image, mode).withNotice(VisionNotice.QUOTA_SIMPLIFIED)
        } catch (e: Exception) {
            onDevice.describe(image, mode).withNotice(VisionNotice.CLOUD_FAILED_SIMPLIFIED)
        }
    }

    /** Só nuvem (modo Caminhar): null quando indisponível ou em falha — o local continua falando. */
    suspend fun describeCloudOnly(image: Bitmap, mode: VisionMode, target: String? = null): VisionResult? {
        if (!settings.current().useCloudAi || !cloudConfigured || !cloudAllowed() || !connectivity.isOnline()) return null
        return try {
            cloud.describe(image, mode, target)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            null
        }
    }

    private fun VisionResult.withNotice(notice: VisionNotice): VisionResult =
        if (this is VisionResult.Success) copy(notice = notice) else this
}
