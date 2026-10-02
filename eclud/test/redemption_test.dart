import 'package:eclud/data/models/redemption.dart';
import 'package:eclud/demo/demo_redemption_repository.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('PIN correto ativa o desconto', () async {
    final repo = DemoRedemptionRepository();
    final result = await repo.redeem(partnerId: 'p1', pin: '1234');
    expect(result, isA<RedemptionSuccess>());
    expect((result as RedemptionSuccess).redemption.discountPercent, 15);
  });

  test('PIN errado informa tentativas e bloqueia após o limite', () async {
    final repo = DemoRedemptionRepository();
    final first = await repo.redeem(partnerId: 'p1', pin: '0000');
    expect((first as RedemptionWrongPin).remainingAttempts, 4);

    RedemptionResult last = first;
    for (var i = 0; i < 4; i++) {
      last = await repo.redeem(partnerId: 'p1', pin: '0000');
    }
    expect(last, isA<RedemptionLocked>());

    // Bloqueado: nem o PIN certo passa.
    final blocked = await repo.redeem(partnerId: 'p1', pin: '1234');
    expect(blocked, isA<RedemptionLocked>());
  });
}
