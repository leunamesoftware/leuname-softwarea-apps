import '../../features/savings/savings_entry.dart';

/// Histórico de descontos usados pelo cliente.
abstract interface class SavingsRepository {
  Future<List<SavingsEntry>> fetchCurrentMonth();

  Future<void> setAmountPaid(String code, double amount);
}
