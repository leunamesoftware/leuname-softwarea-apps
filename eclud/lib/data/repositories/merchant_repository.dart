import '../models/merchant_dashboard.dart';

/// Dados do estabelecimento do lojista logado.
abstract interface class MerchantRepository {
  Future<MerchantDashboard> fetchDashboard();

  Future<void> saveSettings(MerchantSettings settings);
}
