import '../models/merchant_dashboard.dart';
import '../repositories/merchant_repository.dart';
import 'api_client.dart';

class ApiMerchantRepository implements MerchantRepository {
  ApiMerchantRepository(this._api);

  final ApiClient _api;

  @override
  Future<MerchantDashboard> fetchDashboard() async =>
      MerchantDashboard.fromJson(
        await _api.get('/merchant/dashboard') as Map<String, dynamic>,
      );

  @override
  Future<void> saveSettings(MerchantSettings settings) =>
      _api.put('/merchant/settings', settings.toJson());
}
