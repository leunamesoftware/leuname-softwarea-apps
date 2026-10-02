import 'package:eclud/core/config/app_config.dart';
import 'package:eclud/data/models/redemption.dart';
import 'package:eclud/demo/demo_partner_repository.dart';
import 'package:eclud/features/savings/savings_entry.dart';
import 'package:eclud/features/savings/savings_providers.dart';
import 'package:flutter_test/flutter_test.dart';

SavingsEntry _entry(int percent, double? paid) => SavingsEntry(
  partner: DemoPartnerRepository.partners.first,
  amountPaid: paid,
  redemption: Redemption(
    code: 'X',
    partnerId: 'p1',
    discountPercent: percent,
    redeemedAt: DateTime(2026, 10, 1),
  ),
);

void main() {
  test('economia é calculada sobre a conta cheia', () {
    // Pagou 85 € com 15%: a conta era 100 €, economizou 15 €.
    expect(_entry(15, 85).saved, 15);
    // Pagou 80 € com 20%: a conta era 100 €, economizou 20 €.
    expect(_entry(20, 80).saved, 20);
  });

  test('sem valor informado não há economia calculada', () {
    expect(_entry(15, null).saved, isNull);
  });

  test('benefício do mês desconta a assinatura', () {
    final summary = MonthlySavings([_entry(15, 85), _entry(10, null)]);
    expect(summary.totalSaved, 15);
    expect(summary.netBenefit, 15 - AppConfig.monthlyPrice);
  });
}
