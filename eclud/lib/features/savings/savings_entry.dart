import '../../data/models/partner.dart';
import '../../data/models/partner_category.dart';
import '../../data/models/redemption.dart';

/// Um desconto usado, com o valor pago (informado pelo cliente depois).
class SavingsEntry {
  const SavingsEntry({
    required this.redemption,
    required this.partnerName,
    required this.category,
    required this.priceLevel,
    this.imageUrl,
    this.amountPaid,
  });

  SavingsEntry.fromPartner(this.redemption, Partner partner, {this.amountPaid})
    : partnerName = partner.name,
      category = partner.category,
      priceLevel = partner.priceLevel,
      imageUrl = partner.imageUrl;

  factory SavingsEntry.fromJson(Map<String, dynamic> json) => SavingsEntry(
    redemption: Redemption.fromJson(json),
    partnerName: json['merchantName'] as String,
    category: PartnerCategory.values.byName(json['category'] as String),
    priceLevel: json['priceLevel'] as int,
    imageUrl: json['imageUrl'] as String?,
    amountPaid: (json['amountPaid'] as num?)?.toDouble(),
  );

  final Redemption redemption;
  final String partnerName;
  final PartnerCategory category;
  final int priceLevel;
  final String? imageUrl;

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

  SavingsEntry withAmountPaid(double value) => SavingsEntry(
    redemption: redemption,
    partnerName: partnerName,
    category: category,
    priceLevel: priceLevel,
    imageUrl: imageUrl,
    amountPaid: value,
  );

  static double roundCents(double value) => (value * 100).round() / 100;
}
