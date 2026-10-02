/// Uso de um desconto, confirmado pelo PIN do estabelecimento.
class Redemption {
  const Redemption({
    required this.code,
    required this.partnerId,
    required this.discountPercent,
    required this.redeemedAt,
  });

  /// Código curto que o funcionário pode conferir ou anotar.
  final String code;
  final String partnerId;
  final int discountPercent;
  final DateTime redeemedAt;
}

/// Resultado da validação do PIN.
sealed class RedemptionResult {
  const RedemptionResult();
}

final class RedemptionSuccess extends RedemptionResult {
  const RedemptionSuccess(this.redemption);

  final Redemption redemption;
}

final class RedemptionWrongPin extends RedemptionResult {
  const RedemptionWrongPin(this.remainingAttempts);

  final int remainingAttempts;
}

final class RedemptionLocked extends RedemptionResult {
  const RedemptionLocked(this.retryAfter);

  final Duration retryAfter;
}
