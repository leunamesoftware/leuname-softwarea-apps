/// Estado do anúncio, conforme regras de negócio do LeuPlace (Fase 5/8).
enum ProductStatus {
  active,
  paused,
  sold,
  expired,
  soldOut;

  static ProductStatus fromString(String? value) {
    return ProductStatus.values.firstWhere(
      (status) => status.name == value,
      orElse: () => ProductStatus.active,
    );
  }
}

/// Condição física do produto anunciado.
enum ProductCondition {
  novo,
  usado;

  static ProductCondition fromString(String? value) {
    return ProductCondition.values.firstWhere(
      (condition) => condition.name == value,
      orElse: () => ProductCondition.usado,
    );
  }
}
