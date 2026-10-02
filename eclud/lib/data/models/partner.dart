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
    required this.city,
    required this.country,
    this.imageUrl,
    this.rating,
    this.reviewCount = 0,
    this.menuUrl,
    this.discountRule,
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
  final String city;
  final String country;
  final String? imageUrl;

  /// Nota média de 0 a 5; `null` enquanto não houver avaliações.
  final double? rating;
  final int reviewCount;

  /// Link do cardápio no site do próprio estabelecimento.
  final String? menuUrl;

  /// Regra específica do desconto; sem ela, o app usa o texto padrão.
  final String? discountRule;

  String get priceLabel => '€' * priceLevel;

  factory Partner.fromJson(Map<String, dynamic> json) => Partner(
    id: json['id'] as String,
    name: json['name'] as String,
    category: PartnerCategory.values.byName(json['category'] as String),
    priceLevel: json['priceLevel'] as int,
    discountPercent: json['discountPercent'] as int,
    location: LatLng(
      (json['lat'] as num).toDouble(),
      (json['lng'] as num).toDouble(),
    ),
    address: json['address'] as String,
    city: json['city'] as String,
    country: json['country'] as String,
    imageUrl: json['imageUrl'] as String?,
    rating: (json['rating'] as num?)?.toDouble(),
    reviewCount: json['reviewCount'] as int? ?? 0,
    menuUrl: json['menuUrl'] as String?,
    discountRule: json['discountRule'] as String?,
  );
}

/// Parceiro com a distância já calculada até o usuário, em metros.
class NearbyPartner {
  const NearbyPartner(this.partner, this.distanceMeters);

  final Partner partner;
  final double distanceMeters;
}
