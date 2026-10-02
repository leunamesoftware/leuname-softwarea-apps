import '../data/models/redemption.dart';
import '../data/repositories/savings_repository.dart';
import '../features/savings/savings_entry.dart';
import 'demo_partner_repository.dart';

/// Histórico de demonstração na memória, com três exemplos no mês atual.
class DemoSavingsRepository implements SavingsRepository {
  DemoSavingsRepository() : _entries = _seed(DateTime.now());

  final List<SavingsEntry> _entries;

  void record(Redemption redemption) {
    final partner = DemoPartnerRepository.partners.firstWhere(
      (p) => p.id == redemption.partnerId,
    );
    _entries.insert(0, SavingsEntry.fromPartner(redemption, partner));
  }

  @override
  Future<List<SavingsEntry>> fetchCurrentMonth() async {
    final now = DateTime.now();
    return _entries
        .where(
          (e) =>
              e.redemption.redeemedAt.year == now.year &&
              e.redemption.redeemedAt.month == now.month,
        )
        .toList();
  }

  @override
  Future<void> setAmountPaid(String code, double amount) async {
    final i = _entries.indexWhere((e) => e.redemption.code == code);
    if (i != -1) _entries[i] = _entries[i].withAmountPaid(amount);
  }

  static List<SavingsEntry> _seed(DateTime now) {
    final partners = {for (final p in DemoPartnerRepository.partners) p.id: p};
    SavingsEntry entry(String id, int daysAgo, String code, double paid) {
      final partner = partners[id]!;
      final date = now.subtract(Duration(days: daysAgo));
      return SavingsEntry.fromPartner(
        Redemption(
          code: code,
          partnerId: id,
          discountPercent: partner.discountPercent,
          // Exemplos sempre dentro do mês atual.
          redeemedAt: date.month == now.month ? date : now,
        ),
        partner,
        amountPaid: paid,
      );
    }

    return [
      entry('p1', 1, 'DEMO01', 70.55),
      entry('p2', 3, 'DEMO02', 46.80),
      entry('p3', 6, 'DEMO03', 75.60),
    ];
  }
}
