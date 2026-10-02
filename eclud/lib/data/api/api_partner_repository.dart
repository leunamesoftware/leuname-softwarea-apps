import '../models/partner.dart';
import '../models/review.dart';
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

  @override
  Future<List<Review>> fetchReviews(String partnerId) async {
    final list = await _api.get(
      '/partners/${Uri.encodeComponent(partnerId)}/reviews',
    ) as List<dynamic>;
    return [
      for (final item in list) Review.fromJson(item as Map<String, dynamic>),
    ];
  }

  @override
  Future<void> submitReview(String partnerId, int rating, String? comment) =>
      _api.put('/partners/${Uri.encodeComponent(partnerId)}/review', {
        'rating': rating,
        'comment': comment,
      });
}
