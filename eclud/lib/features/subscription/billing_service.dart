import 'dart:async';

import 'package:in_app_purchase/in_app_purchase.dart';

import '../../data/api/api_client.dart';
import '../../demo/demo_auth_repository.dart';

/// Oferta mostrada na tela de assinatura (preço já no formato da Play).
class StoreOffer {
  const StoreOffer({required this.price});

  final String price;
}

sealed class BillingEvent {
  const BillingEvent();
}

/// Compra confirmada pelo nosso servidor.
final class BillingSuccess extends BillingEvent {
  const BillingSuccess();
}

final class BillingPending extends BillingEvent {
  const BillingPending();
}

final class BillingCanceled extends BillingEvent {
  const BillingCanceled();
}

final class BillingFailure extends BillingEvent {
  const BillingFailure(this.error);

  final Object error;
}

/// Venda da assinatura — só pela Google Play.
abstract interface class BillingService {
  static const productId = 'eclud_mensual';

  Stream<BillingEvent> get events;

  /// `null` quando a Play não está disponível (ex.: navegador do PC).
  Future<StoreOffer?> loadOffer();

  /// [userId] vai junto da compra: o servidor só aceita a compra na
  /// conta que a fez.
  Future<void> buy(String userId);

  Future<void> restore();

  void dispose();
}

class PlayBillingService implements BillingService {
  PlayBillingService(this._api) {
    _subscription = _iap.purchaseStream.listen(
      _onPurchases,
      onError: (Object e) => _events.add(BillingFailure(e)),
    );
  }

  final ApiClient _api;
  final _iap = InAppPurchase.instance;
  final _events = StreamController<BillingEvent>.broadcast();
  late final StreamSubscription<List<PurchaseDetails>> _subscription;
  ProductDetails? _product;

  @override
  Stream<BillingEvent> get events => _events.stream;

  @override
  Future<StoreOffer?> loadOffer() async {
    if (!await _iap.isAvailable()) return null;
    final response = await _iap.queryProductDetails({BillingService.productId});
    final product = response.productDetails.firstOrNull;
    _product = product;
    return product == null ? null : StoreOffer(price: product.price);
  }

  @override
  Future<void> buy(String userId) async {
    final product = _product;
    if (product == null) {
      _events.add(const BillingFailure('product_unavailable'));
      return;
    }
    await _iap.buyNonConsumable(
      purchaseParam: PurchaseParam(
        productDetails: product,
        applicationUserName: userId,
      ),
    );
  }

  @override
  Future<void> restore() => _iap.restorePurchases();

  Future<void> _onPurchases(List<PurchaseDetails> purchases) async {
    for (final purchase in purchases) {
      if (purchase.productID != BillingService.productId) continue;
      switch (purchase.status) {
        case PurchaseStatus.pending:
          _events.add(const BillingPending());
        case PurchaseStatus.canceled:
          _events.add(const BillingCanceled());
        case PurchaseStatus.error:
          _events.add(BillingFailure(purchase.error ?? 'purchase_error'));
        case PurchaseStatus.purchased:
        case PurchaseStatus.restored:
          try {
            // Só confirma (acknowledge) depois de o servidor validar com o
            // Google; compra não confirmada em 3 dias é reembolsada.
            await _api.post('/billing/google/verify', {
              'purchaseToken': purchase.verificationData.serverVerificationData,
              'productId': BillingService.productId,
            });
            if (purchase.pendingCompletePurchase) {
              await _iap.completePurchase(purchase);
            }
            _events.add(const BillingSuccess());
          } catch (e) {
            _events.add(BillingFailure(e));
          }
      }
    }
  }

  @override
  void dispose() {
    _subscription.cancel();
    _events.close();
  }
}

/// Assinatura simulada no modo demonstração.
class DemoBillingService implements BillingService {
  DemoBillingService(this._auth);

  final DemoAuthRepository _auth;
  final _events = StreamController<BillingEvent>.broadcast();

  @override
  Stream<BillingEvent> get events => _events.stream;

  @override
  Future<StoreOffer?> loadOffer() async => const StoreOffer(price: '1,99 €');

  @override
  Future<void> buy(String userId) async {
    await Future<void>.delayed(const Duration(milliseconds: 600));
    _auth.subscribed = true;
    _events.add(const BillingSuccess());
  }

  @override
  Future<void> restore() => buy('');

  @override
  void dispose() => _events.close();
}
