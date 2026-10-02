import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/config/app_config.dart';
import '../../data/models/partner.dart';
import '../../data/models/redemption.dart';
import '../../demo/demo_partner_repository.dart';
import 'savings_entry.dart';

/// Histórico de descontos usados. Fica na memória por enquanto (com
/// exemplos); passa a vir da conta do usuário quando o backend existir.
class SavingsHistory extends Notifier<List<SavingsEntry>> {
  @override
  List<SavingsEntry> build() => _demoEntries(DateTime.now());

  void add(Redemption redemption, Partner partner) {
    state = [SavingsEntry(redemption: redemption, partner: partner), ...state];
  }

  void setAmountPaid(String code, double amount) {
    state = [
      for (final e in state)
        e.redemption.code == code ? e.withAmountPaid(amount) : e,
    ];
  }
}

final savingsHistoryProvider =
    NotifierProvider<SavingsHistory, List<SavingsEntry>>(SavingsHistory.new);

/// Resumo do mês atual.
class MonthlySavings {
  const MonthlySavings(this.entries);

  final List<SavingsEntry> entries;

  double get totalSaved => SavingsEntry.roundCents(
    entries.fold(0, (sum, e) => sum + (e.saved ?? 0)),
  );

  double get subscription => AppConfig.monthlyPrice;

  double get netBenefit => SavingsEntry.roundCents(totalSaved - subscription);
}

final monthlySavingsProvider = Provider<MonthlySavings>((ref) {
  final now = DateTime.now();
  final entries = ref
      .watch(savingsHistoryProvider)
      .where(
        (e) =>
            e.redemption.redeemedAt.year == now.year &&
            e.redemption.redeemedAt.month == now.month,
      )
      .toList();
  return MonthlySavings(entries);
});

List<SavingsEntry> _demoEntries(DateTime now) {
  final partners = {for (final p in DemoPartnerRepository.partners) p.id: p};
  SavingsEntry entry(String id, int daysAgo, String code, double paid) {
    final partner = partners[id]!;
    final date = now.subtract(Duration(days: daysAgo));
    return SavingsEntry(
      partner: partner,
      amountPaid: paid,
      redemption: Redemption(
        code: code,
        partnerId: id,
        discountPercent: partner.discountPercent,
        // Exemplos sempre dentro do mês atual.
        redeemedAt: date.month == now.month ? date : now,
      ),
    );
  }

  return [
    entry('p1', 1, 'DEMO01', 70.55),
    entry('p2', 3, 'DEMO02', 46.80),
    entry('p3', 6, 'DEMO03', 75.60),
  ];
}
