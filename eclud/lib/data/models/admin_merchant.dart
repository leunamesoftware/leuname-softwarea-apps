import 'package:latlong2/latlong.dart';

import 'partner.dart';
import 'partner_category.dart';

enum MerchantStatus { pending, approved, rejected }

/// Estabelecimento visto pelo administrador.
class AdminMerchant {
  const AdminMerchant({
    required this.partner,
    required this.status,
    required this.isActive,
    this.ownerEmail,
  });

  final Partner partner;
  final MerchantStatus status;
  final bool isActive;
  final String? ownerEmail;

  factory AdminMerchant.fromJson(Map<String, dynamic> json) => AdminMerchant(
    partner: Partner.fromJson(json),
    status: MerchantStatus.values.byName(json['status'] as String),
    isActive: json['isActive'] as bool,
    ownerEmail: json['ownerEmail'] as String?,
  );

  AdminMerchant withStatus(MerchantStatus value) => AdminMerchant(
    partner: partner,
    status: value,
    isActive: isActive,
    ownerEmail: ownerEmail,
  );
}

/// Dados para cadastrar um estabelecimento.
class NewMerchant {
  const NewMerchant({
    required this.name,
    required this.category,
    required this.priceLevel,
    required this.discountPercent,
    required this.address,
    required this.city,
    required this.country,
    required this.location,
    required this.ownerEmail,
    required this.pin,
    this.discountRule,
    this.menuUrl,
    this.imageUrl,
  });

  final String name;
  final PartnerCategory category;
  final int priceLevel;
  final int discountPercent;
  final String address;
  final String city;
  final String country;
  final LatLng location;
  final String ownerEmail;
  final String pin;
  final String? discountRule;
  final String? menuUrl;
  final String? imageUrl;

  Map<String, dynamic> toJson() => {
    'name': name,
    'category': category.name,
    'priceLevel': priceLevel,
    'discountPercent': discountPercent,
    'discountRule': discountRule,
    'address': address,
    'city': city,
    'country': country,
    'lat': location.latitude,
    'lng': location.longitude,
    'menuUrl': menuUrl,
    'imageUrl': imageUrl,
    'ownerEmail': ownerEmail,
    'pin': pin,
  };
}
