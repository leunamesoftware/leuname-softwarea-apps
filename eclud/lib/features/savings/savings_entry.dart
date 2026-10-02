import '../../data/models/partner.dart';
import '../../data/models/redemption.dart';

/// Um desconto usado, com o valor pago (informado pelo cliente depois).
class SavingsEntry {
  const SavingsEntry({
    required this.redemption,
    required this.partner,
    this.amountPaid,
  });

  final Redemption redemption;
  final Partner partner;

  /// Valor pago já com desconto, em euros; `null` até o cliente informar.
  final double? amountPaid;

  /// Quanto o cliente deixou de pagar. Se pagou P com d% de desconto, a
  /// conta cheia era P / (1 - d), então a economia é P · d / (100 - d).
  double? get saved {
    final paid = amountPaid;
    if (paid == null) return null;
    final pct = redemption.discountPercent;
    return roundCents(paid * pct / (100 - pct));
  }

  SavingsEntry withAmountPaid(double value) =>
      SavingsEntry(redemption: redemption, partner: partner, amountPaid: value);

  static double roundCents(double value) => (value * 100).round() / 100;
}
