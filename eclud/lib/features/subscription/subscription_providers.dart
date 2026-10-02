import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/config/app_config.dart';
import '../auth/session_providers.dart';
import 'billing_service.dart';

/// `null` no navegador: a assinatura só é vendida pelo app Android.
final billingServiceProvider = Provider<BillingService?>((ref) {
  final BillingService? service = AppConfig.isDemo
      ? DemoBillingService(ref.watch(demoAuthRepositoryProvider))
      : kIsWeb
      ? null
      : PlayBillingService(ref.watch(apiClientProvider));
  ref.onDispose(() => service?.dispose());
  return service;
});

final storeOfferProvider = FutureProvider<StoreOffer?>((ref) async {
  final billing = ref.watch(billingServiceProvider);
  return billing?.loadOffer();
});

/// Link oficial da Play para o cliente cancelar ou trocar a forma de pagamento.
const manageSubscriptionUrl =
    'https://play.google.com/store/account/subscriptions'
    '?sku=${BillingService.productId}&package=com.leunamesoftwares.eclud';
