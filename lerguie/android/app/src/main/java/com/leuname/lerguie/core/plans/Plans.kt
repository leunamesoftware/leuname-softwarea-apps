package com.leuname.lerguie.core.plans

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Recursos do app. As funções ESSENCIAIS de acessibilidade nunca podem ser bloqueadas
 * por plano — isso é garantido em [Entitlements.canUse], não por configuração remota.
 * Recursos não essenciais podem ser liberados por plano via catálogo remoto.
 */
enum class Feature(val essential: Boolean) {
    // Essenciais (sempre gratuitas)
    SEE(true),
    READ(true),
    LISTEN(true),
    COMMUNICATE(true),
    TEXT_TO_SPEECH(true),
    VOICE_COMMANDS(true),
    HAZARD_ALERTS(true),
    LOCAL_HISTORY(true),
    ACCESSIBILITY_SETTINGS(true),

    // Extras configuráveis por plano
    CLOUD_DESCRIPTION(false),
    CLOUD_SYNC(false),
    DOCUMENT_SUMMARY(false),
    LIBRAS_ADVANCED(false),
    EXPORT(false),
}

/** Limites numéricos configuráveis. Ausente no plano = sem limite definido pelo cliente. */
object Limits {
    const val CLOUD_DESCRIPTIONS_PER_DAY = "cloud_descriptions_per_day"
}

@Serializable
data class Plan(
    val id: String,
    /** Nome por idioma (ex.: {"pt-BR": "Gratuito"}). */
    val name: Map<String, String> = emptyMap(),
    val description: Map<String, String> = emptyMap(),
    /** Id da assinatura no Google Play (null = plano gratuito). Preço vem SEMPRE da Play Store. */
    val productId: String? = null,
    val basePlanIds: List<String> = emptyList(),
    val features: List<String> = emptyList(),
    val limits: Map<String, Int> = emptyMap(),
) {
    fun localizedName(tag: String): String = name[tag] ?: name.values.firstOrNull() ?: id
    fun localizedDescription(tag: String): String = description[tag] ?: description.values.firstOrNull().orEmpty()
}

@Serializable
data class PlanCatalog(
    val version: Int = 1,
    /** Chave geral: enquanto false, o app não mostra ofertas de assinatura. */
    @SerialName("monetizationEnabled") val monetizationEnabled: Boolean = false,
    val defaultPlanId: String = "free",
    val plans: List<Plan> = emptyList(),
) {
    fun plan(id: String?): Plan = plans.firstOrNull { it.id == id } ?: plans.firstOrNull { it.id == defaultPlanId } ?: FREE

    companion object {
        val FREE = Plan(
            id = "free",
            name = mapOf("pt-BR" to "Gratuito"),
            features = listOf(Feature.CLOUD_DESCRIPTION.name),
            limits = mapOf(Limits.CLOUD_DESCRIPTIONS_PER_DAY to 30),
        )

        /** Usado offline ou antes do primeiro download do catálogo. */
        val DEFAULT = PlanCatalog(plans = listOf(FREE))
    }
}

data class Entitlements(val plan: Plan, val catalog: PlanCatalog) {
    fun canUse(feature: Feature): Boolean = feature.essential || feature.name in plan.features

    fun limit(key: String): Int? = plan.limits[key]

    val isPaid: Boolean get() = plan.productId != null
}
