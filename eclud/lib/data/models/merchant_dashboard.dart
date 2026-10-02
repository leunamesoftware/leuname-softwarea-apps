import 'partner.dart';

/// Cupom validado na loja, visto pelo lojista.
class MerchantCoupon {
  const MerchantCoupon({
    required this.code,
    required this.validatedAt,
    required this.discountPercent,
    this.discountAmount,
  });

  final String code;
  final DateTime validatedAt;
  final int discountPercent;

  /// Desconto em euros, quando o valor da conta é conhecido.
  final double? discountAmount;
}

/// Números do mês para o painel do lojista.
class MerchantDashboard {
  const MerchantDashboard({
    required this.partner,
    required this.isActive,
    required this.validatedCoupons,
    required this.discountGranted,
    required this.newCustomers,
    required this.dailyValidations,
    required this.chartStart,
    required this.recentCoupons,
  });

  final Partner partner;
  final bool isActive;
  final int validatedCoupons;
  final double discountGranted;
  final int newCustomers;

  /// Validações dos últimos 30 dias; o índice 0 corresponde a [chartStart].
  final List<int> dailyValidations;
  final DateTime chartStart;
  final List<MerchantCoupon> recentCoupons;
}

/// Ajustes que o lojista pode mudar.
class MerchantSettings {
  const MerchantSettings({
    required this.isActive,
    required this.discountPercent,
    required this.discountRule,
    this.menuUrl,
    this.newPin,
  });

  final bool isActive;
  final int discountPercent;
  final String discountRule;
  final String? menuUrl;

  /// Novo PIN; `null` mantém o atual. Só é enviado ao servidor, nunca lido.
  final String? newPin;
}
