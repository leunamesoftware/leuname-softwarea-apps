package com.leuname.lerguie.core.billing

import android.app.Activity

/** Oferta de assinatura com preço já formatado pela Play Store (moeda e idioma do usuário). */
data class StoreOffer(
    val productId: String,
    val basePlanId: String,
    val offerToken: String,
    val formattedPrice: String,
    val billingPeriod: String,
)

data class OwnedPurchase(val productId: String, val purchaseToken: String, val acknowledged: Boolean)

sealed interface PurchaseOutcome {
    data class Purchased(val purchase: OwnedPurchase) : PurchaseOutcome
    data object Cancelled : PurchaseOutcome
    data object Pending : PurchaseOutcome
    data class Failed(val code: Int) : PurchaseOutcome
}

/**
 * Abstração da loja. Hoje: Google Play Billing. Futuro iOS: implementação StoreKit.
 * A validação da compra é SEMPRE feita pelo backend (nunca confiar só no aparelho).
 */
interface BillingGateway {
    suspend fun isReady(): Boolean
    suspend fun offers(productIds: List<String>): List<StoreOffer>
    suspend fun purchase(activity: Activity, offer: StoreOffer): PurchaseOutcome
    suspend fun ownedSubscriptions(): List<OwnedPurchase>
    suspend fun acknowledge(purchaseToken: String): Boolean
}
