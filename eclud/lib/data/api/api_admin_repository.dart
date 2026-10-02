import '../models/admin_merchant.dart';
import '../repositories/admin_repository.dart';
import 'api_client.dart';

class ApiAdminRepository implements AdminRepository {
  ApiAdminRepository(this._api);

  final ApiClient _api;

  @override
  Future<List<AdminMerchant>> fetchMerchants() async {
    final list = await _api.get('/admin/merchants') as List<dynamic>;
    return [
      for (final item in list)
        AdminMerchant.fromJson(item as Map<String, dynamic>),
    ];
  }

  @override
  Future<void> createMerchant(NewMerchant merchant) =>
      _api.post('/admin/merchants', merchant.toJson());

  @override
  Future<void> setStatus(String merchantId, MerchantStatus status) =>
      _api.patch('/admin/merchants/${Uri.encodeComponent(merchantId)}', {
        'status': status.name,
      });
}
