package com.leuname.lerguie.core.billing

import android.app.Activity
import android.content.Context
import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import com.android.billingclient.api.acknowledgePurchase
import com.android.billingclient.api.queryProductDetails
import com.android.billingclient.api.queryPurchasesAsync
import kotlin.coroutines.resume
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/** Google Play Billing. Só é usado quando o catálogo remoto liga a monetização. */
class PlayBillingGateway(context: Context) : BillingGateway {
    private var pendingPurchase: CompletableDeferred<PurchaseOutcome>? = null
    private val connectMutex = Mutex()

    private val listener = PurchasesUpdatedListener { result, purchases ->
        val outcome = when (result.responseCode) {
            BillingClient.BillingResponseCode.OK -> purchases?.firstOrNull()?.let { p ->
                if (p.purchaseState == Purchase.PurchaseState.PENDING) PurchaseOutcome.Pending
                else PurchaseOutcome.Purchased(p.toOwned())
            } ?: PurchaseOutcome.Failed(result.responseCode)
            BillingClient.BillingResponseCode.USER_CANCELED -> PurchaseOutcome.Cancelled
            else -> PurchaseOutcome.Failed(result.responseCode)
        }
        pendingPurchase?.complete(outcome)
    }

    private val client = BillingClient.newBuilder(context.applicationContext)
        .setListener(listener)
        .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
        .build()

    override suspend fun isReady(): Boolean = connectMutex.withLock {
        if (client.isReady) return@withLock true
        suspendCancellableCoroutine { cont ->
            client.startConnection(object : BillingClientStateListener {
                override fun onBillingSetupFinished(result: BillingResult) {
                    if (cont.isActive) cont.resume(result.responseCode == BillingClient.BillingResponseCode.OK)
                }

                override fun onBillingServiceDisconnected() {
                    if (cont.isActive) cont.resume(false)
                }
            })
        }
    }

    override suspend fun offers(productIds: List<String>): List<StoreOffer> {
        if (productIds.isEmpty() || !isReady()) return emptyList()
        val params = QueryProductDetailsParams.newBuilder().setProductList(
            productIds.map {
                QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(it)
                    .setProductType(BillingClient.ProductType.SUBS)
                    .build()
            }
        ).build()
        val result = client.queryProductDetails(params)
        details.clear()
        return result.productDetailsList.orEmpty().flatMap { pd ->
            details[pd.productId] = pd
            pd.subscriptionOfferDetails.orEmpty().mapNotNull { offer ->
                val phase = offer.pricingPhases.pricingPhaseList.lastOrNull() ?: return@mapNotNull null
                StoreOffer(pd.productId, offer.basePlanId, offer.offerToken, phase.formattedPrice, phase.billingPeriod)
            }
        }
    }

    private val details = mutableMapOf<String, com.android.billingclient.api.ProductDetails>()

    override suspend fun purchase(activity: Activity, offer: StoreOffer): PurchaseOutcome {
        val pd = details[offer.productId] ?: return PurchaseOutcome.Failed(BillingClient.BillingResponseCode.ITEM_UNAVAILABLE)
        val deferred = CompletableDeferred<PurchaseOutcome>()
        pendingPurchase = deferred
        val params = BillingFlowParams.newBuilder().setProductDetailsParamsList(
            listOf(
                BillingFlowParams.ProductDetailsParams.newBuilder()
                    .setProductDetails(pd)
                    .setOfferToken(offer.offerToken)
                    .build()
            )
        ).build()
        val launch = client.launchBillingFlow(activity, params)
        if (launch.responseCode != BillingClient.BillingResponseCode.OK) return PurchaseOutcome.Failed(launch.responseCode)
        return deferred.await()
    }

    override suspend fun ownedSubscriptions(): List<OwnedPurchase> {
        if (!isReady()) return emptyList()
        val params = QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build()
        return client.queryPurchasesAsync(params).purchasesList
            .filter { it.purchaseState == Purchase.PurchaseState.PURCHASED }
            .map { it.toOwned() }
    }

    override suspend fun acknowledge(purchaseToken: String): Boolean {
        if (!isReady()) return false
        val params = AcknowledgePurchaseParams.newBuilder().setPurchaseToken(purchaseToken).build()
        return client.acknowledgePurchase(params).responseCode == BillingClient.BillingResponseCode.OK
    }

    private fun Purchase.toOwned() = OwnedPurchase(products.firstOrNull().orEmpty(), purchaseToken, isAcknowledged)
}
