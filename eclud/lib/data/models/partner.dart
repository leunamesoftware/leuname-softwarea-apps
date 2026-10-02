import 'package:latlong2/latlong.dart';

import 'partner_category.dart';

/// Estabelecimento parceiro que oferece desconto aos membros.
class Partner {
  const Partner({
    required this.id,
    required this.name,
    required this.category,
    required this.priceLevel,
    required this.discountPercent,
    required this.location,
    required this.address,
    this.imageUrl,
  }) : assert(priceLevel >= 1 && priceLevel <= 3),
       assert(discountPercent > 0 && discountPercent <= 100);

  final String id;
  final String name;
  final PartnerCategory category;

  /// Faixa de preço, de 1 (€) a 3 (€€€).
  final int priceLevel;
  final int discountPercent;
  final LatLng location;
  final String address;
  final String? imageUrl;

  String get priceLabel => '€' * priceLevel;
}

/// Parceiro com a distância já calculada até o usuário, em metros.
class NearbyPartner {
  const NearbyPartner(this.partner, this.distanceMeters);

  final Partner partner;
  final double distanceMeters;
}
