import '../models/partner.dart';
import '../repositories/partner_repository.dart';
import 'api_client.dart';

class ApiPartnerRepository implements PartnerRepository {
  ApiPartnerRepository(this._api);

  final ApiClient _api;

  @override
  Future<List<Partner>> fetchPartners() async {
    final list = await _api.get('/partners') as List<dynamic>;
    return [
      for (final item in list) Partner.fromJson(item as Map<String, dynamic>),
    ];
  }
}
