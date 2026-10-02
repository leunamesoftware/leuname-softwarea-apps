import '../models/redemption.dart';
import '../repositories/redemption_repository.dart';
import 'api_client.dart';

class ApiRedemptionRepository implements RedemptionRepository {
  ApiRedemptionRepository(this._api);

  final ApiClient _api;

  @override
  Future<RedemptionResult> redeem({
    required String partnerId,
    required String pin,
  }) async {
    try {
      final json = await _api.post('/redemptions', {
        'merchantId': partnerId,
        'pin': pin,
      });
      return RedemptionSuccess(
        Redemption.fromJson(json as Map<String, dynamic>),
      );
    } on ApiException catch (e) {
      return switch (e.code) {
        'wrong_pin' => RedemptionWrongPin(
          e.data['remainingAttempts'] as int? ?? 0,
        ),
        'pin_locked' => RedemptionLocked(
          Duration(seconds: e.data['retryAfterSeconds'] as int? ?? 900),
        ),
        'subscription_required' => const RedemptionSubscriptionRequired(),
        _ => throw e,
      };
    }
  }
}
