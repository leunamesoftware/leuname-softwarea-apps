import 'package:latlong2/latlong.dart';

import '../data/models/opening_hours.dart';
import '../data/models/partner.dart';
import '../data/models/review.dart';
import '../data/models/partner_category.dart';
import '../data/repositories/partner_repository.dart';

/// Parceiros fictícios em Madri, usados até o backend estar pronto.
/// O link de cardápio aponta para example.com só para demonstração.
class DemoPartnerRepository implements PartnerRepository {
  @override
  Future<List<Partner>> fetchPartners() async {
    await Future<void>.delayed(const Duration(milliseconds: 400));
    return partners;
  }

  final _reviews = <String, List<Review>>{
    'p1': [
      Review(
        rating: 5,
        author: 'Carmen',
        createdAt: DateTime(2026, 9, 28),
        comment: 'La pasta, espectacular. El descuento se aplicó sin problema.',
      ),
      Review(rating: 4, author: 'Javier', createdAt: DateTime(2026, 9, 20)),
    ],
  };

  @override
  Future<List<Review>> fetchReviews(String partnerId) async =>
      List.of(_reviews[partnerId] ?? const []);

  @override
  Future<void> submitReview(
    String partnerId,
    int rating,
    String? comment,
  ) async {
    _reviews
        .putIfAbsent(partnerId, () => [])
        .insert(
          0,
          Review(
            rating: rating,
            author: 'Tú',
            createdAt: DateTime.now(),
            comment: comment,
          ),
        );
  }

  // Horário típico espanhol: almoço e jantar, com descanso à tarde.
  static const _restaurant = OpeningHours({
    1: [TimeRange(13 * 60, 16 * 60), TimeRange(20 * 60, 23 * 60 + 30)],
    2: [TimeRange(13 * 60, 16 * 60), TimeRange(20 * 60, 23 * 60 + 30)],
    3: [TimeRange(13 * 60, 16 * 60), TimeRange(20 * 60, 23 * 60 + 30)],
    4: [TimeRange(13 * 60, 16 * 60), TimeRange(20 * 60, 23 * 60 + 30)],
    5: [TimeRange(13 * 60, 16 * 60), TimeRange(20 * 60, 60)],
    6: [TimeRange(13 * 60, 16 * 60 + 30), TimeRange(20 * 60, 60)],
  });
  static const _allDay = OpeningHours({
    1: [TimeRange(8 * 60, 21 * 60)],
    2: [TimeRange(8 * 60, 21 * 60)],
    3: [TimeRange(8 * 60, 21 * 60)],
    4: [TimeRange(8 * 60, 21 * 60)],
    5: [TimeRange(8 * 60, 21 * 60)],
    6: [TimeRange(9 * 60, 21 * 60)],
    7: [TimeRange(9 * 60, 15 * 60)],
  });

  static const partners = [
    Partner(
      id: 'p1',
      name: 'La Bella Cucina',
      category: PartnerCategory.food,
      priceLevel: 2,
      discountPercent: 15,
      location: LatLng(40.4189, -3.7065),
      address: 'Calle del Arenal, 12',
      city: 'Madrid',
      country: 'España',
      openingHours: _restaurant,
      rating: 4.8,
      reviewCount: 124,
      menuUrl: 'https://example.com/carta',
    ),
    Partner(
      id: 'p2',
      name: 'Coffee Time',
      category: PartnerCategory.cafe,
      priceLevel: 1,
      discountPercent: 10,
      location: LatLng(40.4150, -3.6990),
      address: 'Calle de las Huertas, 8',
      city: 'Madrid',
      country: 'España',
      openingHours: _allDay,
      rating: 4.6,
      reviewCount: 89,
      menuUrl: 'https://example.com/carta',
      discountRule: '10% de descuento en cafés y bollería. No válido en productos para llevar.',
    ),
    Partner(
      id: 'p3',
      name: 'Barbería Elite',
      category: PartnerCategory.beauty,
      priceLevel: 2,
      discountPercent: 20,
      location: LatLng(40.4215, -3.7010),
      address: 'Calle de la Montera, 25',
      city: 'Madrid',
      country: 'España',
      rating: 4.9,
      reviewCount: 57,
      discountRule:
          '20% de descuento en cortes y arreglos de barba de lunes a jueves.',
    ),
    Partner(
      id: 'p4',
      name: 'Taberna El Rincón',
      category: PartnerCategory.food,
      priceLevel: 2,
      discountPercent: 12,
      location: LatLng(40.4132, -3.7075),
      address: 'Calle de Toledo, 40',
      city: 'Madrid',
      country: 'España',
      openingHours: _restaurant,
      rating: 4.5,
      reviewCount: 210,
      menuUrl: 'https://example.com/carta',
    ),
    Partner(
      id: 'p5',
      name: 'Café Aurora',
      category: PartnerCategory.cafe,
      priceLevel: 1,
      discountPercent: 10,
      location: LatLng(40.4198, -3.7102),
      address: 'Plaza de Isabel II, 3',
      city: 'Madrid',
      country: 'España',
      openingHours: _allDay,
      rating: 4.4,
      reviewCount: 46,
      menuUrl: 'https://example.com/carta',
    ),
    Partner(
      id: 'p6',
      name: 'Estética Luna',
      category: PartnerCategory.beauty,
      priceLevel: 3,
      discountPercent: 18,
      location: LatLng(40.4240, -3.6975),
      address: 'Calle de Fuencarral, 60',
      city: 'Madrid',
      country: 'España',
      rating: 4.7,
      reviewCount: 33,
    ),
    Partner(
      id: 'p7',
      name: 'Cine Estrella',
      category: PartnerCategory.leisure,
      priceLevel: 2,
      discountPercent: 15,
      location: LatLng(40.4205, -3.7058),
      address: 'Gran Vía, 70',
      city: 'Madrid',
      country: 'España',
      rating: 4.3,
      reviewCount: 320,
      discountRule: '15% de descuento en entradas de lunes a jueves. No válido en estrenos.',
    ),
    Partner(
      id: 'p8',
      name: 'Bolera Sol',
      category: PartnerCategory.leisure,
      priceLevel: 1,
      discountPercent: 10,
      location: LatLng(40.4120, -3.7020),
      address: 'Calle de Atocha, 30',
      city: 'Madrid',
      country: 'España',
    ),
    Partner(
      id: 'p9',
      name: 'Sushi Kaze',
      category: PartnerCategory.food,
      priceLevel: 3,
      discountPercent: 15,
      location: LatLng(40.4250, -3.7040),
      address: 'Calle de Hortaleza, 15',
      city: 'Madrid',
      country: 'España',
      rating: 4.8,
      reviewCount: 151,
      menuUrl: 'https://example.com/carta',
    ),
    Partner(
      id: 'p10',
      name: 'Pastelería Dulce',
      category: PartnerCategory.cafe,
      priceLevel: 1,
      discountPercent: 8,
      location: LatLng(40.4160, -3.7120),
      address: 'Calle Mayor, 55',
      city: 'Madrid',
      country: 'España',
      openingHours: _allDay,
      rating: 4.6,
      reviewCount: 72,
    ),
  ];
}
