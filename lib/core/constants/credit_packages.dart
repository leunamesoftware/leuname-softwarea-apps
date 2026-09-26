/// Pacote de créditos de anúncio à venda. Valor inicial — "configurável no
/// painel administrativo" (Fase 11); por ora fixo no app.
class CreditPackage {
  final int credits;
  final double price;
  final bool popular;

  const CreditPackage({
    required this.credits,
    required this.price,
    this.popular = false,
  });

  double get pricePerCredit => price / credits;
}

abstract final class CreditPackages {
  static const List<CreditPackage> all = [
    CreditPackage(credits: 5, price: 9.90),
    CreditPackage(credits: 10, price: 16.90, popular: true),
    CreditPackage(credits: 20, price: 29.90),
    CreditPackage(credits: 50, price: 59.90),
  ];
}
