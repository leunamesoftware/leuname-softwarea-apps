/// Configurações gerais da plataforma, documento único na coleção `settings`
/// (ex.: `settings/app`), editável apenas pelo administrador.
class AppSettingsModel {
  final double adPrice;
  final int adValidityDays;
  final int rewardSalesThreshold;

  const AppSettingsModel({
    this.adPrice = 5.0,
    this.adValidityDays = 40,
    this.rewardSalesThreshold = 30,
  });

  factory AppSettingsModel.fromMap(Map<String, dynamic> map) {
    return AppSettingsModel(
      adPrice: (map['adPrice'] as num?)?.toDouble() ?? 5.0,
      adValidityDays: (map['adValidityDays'] as num?)?.toInt() ?? 40,
      rewardSalesThreshold:
          (map['rewardSalesThreshold'] as num?)?.toInt() ?? 30,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'adPrice': adPrice,
      'adValidityDays': adValidityDays,
      'rewardSalesThreshold': rewardSalesThreshold,
    };
  }
}
