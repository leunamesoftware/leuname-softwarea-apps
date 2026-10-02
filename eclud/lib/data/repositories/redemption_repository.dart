import '../models/redemption.dart';

/// Validação do PIN e registro do uso do desconto.
///
/// Na versão real, o PIN é conferido **só no servidor** (nunca fica no
/// app) e o servidor limita as tentativas — com 4 dígitos, sem esse limite
/// bastariam 10 000 tentativas para descobrir qualquer PIN.
abstract interface class RedemptionRepository {
  Future<RedemptionResult> redeem({
    required String partnerId,
    required String pin,
  });
}
