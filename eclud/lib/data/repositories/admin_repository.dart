import '../models/admin_merchant.dart';

/// Administração dos estabelecimentos (só para administradores).
abstract interface class AdminRepository {
  Future<List<AdminMerchant>> fetchMerchants();

  Future<void> createMerchant(NewMerchant merchant);

  Future<void> setStatus(String merchantId, MerchantStatus status);
}
