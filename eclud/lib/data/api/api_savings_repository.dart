import '../../features/savings/savings_entry.dart';
import '../repositories/savings_repository.dart';
import 'api_client.dart';

class ApiSavingsRepository implements SavingsRepository {
  ApiSavingsRepository(this._api);

  final ApiClient _api;

  @override
  Future<List<SavingsEntry>> fetchCurrentMonth() async {
    final list = await _api.get('/me/redemptions') as List<dynamic>;
    return [
      for (final item in list)
        SavingsEntry.fromJson(item as Map<String, dynamic>),
    ];
  }

  @override
  Future<void> setAmountPaid(String code, double amount) => _api.patch(
    '/me/redemptions/${Uri.encodeComponent(code)}',
    {'amountPaid': amount},
  );
}
