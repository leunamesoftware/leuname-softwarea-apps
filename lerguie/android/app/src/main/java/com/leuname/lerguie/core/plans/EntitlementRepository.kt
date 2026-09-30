package com.leuname.lerguie.core.plans

import android.app.Activity
import android.content.Context
import com.leuname.lerguie.core.billing.BillingGateway
import com.leuname.lerguie.core.billing.PurchaseOutcome
import com.leuname.lerguie.core.billing.StoreOffer
import com.leuname.lerguie.core.network.LerguieApiClient
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.serialization.json.Json

/**
 * Fonte única de "o que este usuário pode usar".
 * - Catálogo de planos vem do backend (configurável sem nova versão do app) e fica em cache.
 * - Plano ativo vem do token do backend (validado com o Google Play no servidor).
 * - Funções essenciais nunca dependem disto (ver [Entitlements.canUse]).
 */
class EntitlementRepository(
    context: Context,
    private val api: LerguieApiClient,
    private val billing: BillingGateway,
    scope: CoroutineScope,
) {
    private val prefs = context.getSharedPreferences("plans", Context.MODE_PRIVATE)
    private val json = Json { ignoreUnknownKeys = true }

    private val catalog = MutableStateFlow(
        prefs.getString("catalog", null)
            ?.let { runCatching { json.decodeFromString(PlanCatalog.serializer(), it) }.getOrNull() }
            ?: PlanCatalog.DEFAULT
    )

    val entitlements: StateFlow<Entitlements> = combine(catalog, api.planId) { c, planId -> Entitlements(c.plan(planId), c) }
        .stateIn(scope, SharingStarted.Eagerly, Entitlements(PlanCatalog.DEFAULT.plan(null), PlanCatalog.DEFAULT))

    /** Atualiza catálogo e revalida assinaturas existentes. Falhas são silenciosas (app segue gratuito). */
    suspend fun refresh() {
        if (!api.isConfigured) return
        try {
            val c = api.plans()
            catalog.value = c
            prefs.edit().putString("catalog", json.encodeToString(PlanCatalog.serializer(), c)).apply()
            if (c.monetizationEnabled) restorePurchases()
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
        }
    }

    suspend fun offers(): List<StoreOffer> {
        val c = catalog.value
        if (!c.monetizationEnabled) return emptyList()
        return billing.offers(c.plans.mapNotNull { it.productId })
    }

    suspend fun subscribe(activity: Activity, offer: StoreOffer): PurchaseOutcome {
        val outcome = billing.purchase(activity, offer)
        if (outcome is PurchaseOutcome.Purchased) {
            api.verifyPurchase(outcome.purchase.productId, outcome.purchase.purchaseToken)
            if (!outcome.purchase.acknowledged) billing.acknowledge(outcome.purchase.purchaseToken)
        }
        return outcome
    }

    suspend fun restorePurchases() {
        billing.ownedSubscriptions().forEach { p ->
            api.verifyPurchase(p.productId, p.purchaseToken)
            if (!p.acknowledged) billing.acknowledge(p.purchaseToken)
        }
    }
}
