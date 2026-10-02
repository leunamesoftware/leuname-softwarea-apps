import '../models/merchant_dashboard.dart';

/// Dados do estabelecimento do lojista logado.
abstract interface class MerchantRepository {
  Future<MerchantDashboard> fetchDashboard();

  Future<void> saveSettings(MerchantSettings settings);

  /// Envia a foto do estabelecimento (jpg/png/webp, até 2 MB).
  Future<void> uploadPhoto(List<int> bytes, String contentType);
}
