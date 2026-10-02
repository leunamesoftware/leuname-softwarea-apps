import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/config/app_config.dart';
import '../../data/api/api_admin_repository.dart';
import '../../data/models/admin_merchant.dart';
import '../../data/repositories/admin_repository.dart';
import '../../demo/demo_admin_repository.dart';
import '../auth/session_providers.dart';
import '../partners/partner_providers.dart';

final adminRepositoryProvider = Provider<AdminRepository>(
  (ref) => AppConfig.isDemo
      ? DemoAdminRepository()
      : ApiAdminRepository(ref.watch(apiClientProvider)),
);

class AdminMerchants extends AsyncNotifier<List<AdminMerchant>> {
  @override
  Future<List<AdminMerchant>> build() =>
      ref.read(adminRepositoryProvider).fetchMerchants();

  Future<void> create(NewMerchant merchant) async {
    await ref.read(adminRepositoryProvider).createMerchant(merchant);
    _refreshAll();
  }

  Future<void> setStatus(String id, MerchantStatus status) async {
    await ref.read(adminRepositoryProvider).setStatus(id, status);
    _refreshAll();
  }

  /// Recarrega a lista e também os parceiros que o app mostra.
  void _refreshAll() {
    ref.invalidateSelf();
    ref.invalidate(nearbyPartnersProvider);
  }
}

final adminMerchantsProvider =
    AsyncNotifierProvider<AdminMerchants, List<AdminMerchant>>(
      AdminMerchants.new,
    );
