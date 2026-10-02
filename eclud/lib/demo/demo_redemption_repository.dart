import 'dart:math';

import '../data/models/redemption.dart';
import '../data/repositories/redemption_repository.dart';
import 'demo_partner_repository.dart';

/// Simulação para a demonstração: o PIN de todos os parceiros é 1234.
/// Reproduz o limite de tentativas que o servidor real vai aplicar.
class DemoRedemptionRepository implements RedemptionRepository {
  DemoRedemptionRepository({DateTime Function()? clock})
    : _clock = clock ?? DateTime.now;

  static const demoPin = '1234';
  static const maxAttempts = 5;
  static const lockDuration = Duration(minutes: 15);

  final DateTime Function() _clock;
  final _failures = <String, int>{};
  final _lockedUntil = <String, DateTime>{};
  final _random = Random();

  @override
  Future<RedemptionResult> redeem({
    required String partnerId,
    required String pin,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 500));
    final now = _clock();

    final lockedUntil = _lockedUntil[partnerId];
    if (lockedUntil != null && now.isBefore(lockedUntil)) {
      return RedemptionLocked(lockedUntil.difference(now));
    }

    if (pin != demoPin) {
      final failures = (_failures[partnerId] ?? 0) + 1;
      if (failures >= maxAttempts) {
        _failures.remove(partnerId);
        _lockedUntil[partnerId] = now.add(lockDuration);
        return const RedemptionLocked(lockDuration);
      }
      _failures[partnerId] = failures;
      return RedemptionWrongPin(maxAttempts - failures);
    }

    _failures.remove(partnerId);
    final partner = DemoPartnerRepository.partners.firstWhere(
      (p) => p.id == partnerId,
    );
    return RedemptionSuccess(
      Redemption(
        code: _code(),
        partnerId: partnerId,
        discountPercent: partner.discountPercent,
        redeemedAt: now,
      ),
    );
  }

  String _code() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return List.generate(6, (_) => chars[_random.nextInt(chars.length)]).join();
  }
}
