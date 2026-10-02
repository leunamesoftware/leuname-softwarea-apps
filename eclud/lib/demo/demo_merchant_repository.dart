import 'dart:math';

import '../data/models/merchant_dashboard.dart';
import '../data/models/partner.dart';
import '../data/repositories/merchant_repository.dart';
import 'demo_partner_repository.dart';

/// Painel de demonstração de "La Bella Cucina", com números fixos
/// (gerados com semente) para a tela ficar sempre igual.
class DemoMerchantRepository implements MerchantRepository {
  DemoMerchantRepository({DateTime Function()? clock})
    : _clock = clock ?? DateTime.now;

  final DateTime Function() _clock;
  MerchantSettings? _saved;

  @override
  Future<MerchantDashboard> fetchDashboard() async {
    await Future<void>.delayed(const Duration(milliseconds: 300));
    final now = _clock();
    final base = DemoPartnerRepository.partners.first;
    final settings = _saved;
    final partner = settings == null
        ? base
        : Partner(
            id: base.id,
            name: base.name,
            category: base.category,
            priceLevel: base.priceLevel,
            discountPercent: settings.discountPercent,
            location: base.location,
            address: base.address,
            city: base.city,
            country: base.country,
            rating: base.rating,
            reviewCount: base.reviewCount,
            menuUrl: settings.menuUrl,
            discountRule: settings.discountRule,
          );

    final random = Random(42);
    const days = 30;
    final daily = List.generate(days, (_) => 4 + random.nextInt(9));
    final total = daily.skip(days - now.day).fold(0, (a, b) => a + b);
    final coupons = List.generate(8, (i) {
      final at = now.subtract(Duration(hours: 3 + i * 7, minutes: i * 13));
      final amount = 20 + random.nextInt(60) + random.nextInt(100) / 100;
      return MerchantCoupon(
        code: 'K${(4821 + i * 137).toRadixString(36).toUpperCase()}',
        validatedAt: at,
        discountPercent: partner.discountPercent,
        discountAmount: i == 2
            ? null
            : (amount * partner.discountPercent).round() / 100,
      );
    });

    return MerchantDashboard(
      partner: partner,
      isActive: settings?.isActive ?? true,
      validatedCoupons: total,
      discountGranted: (total * 3.1 * 100).round() / 100,
      newCustomers: (total * 0.6).round(),
      dailyValidations: daily,
      chartStart: DateTime(now.year, now.month, now.day - (days - 1)),
      recentCoupons: coupons,
    );
  }

  @override
  Future<void> saveSettings(MerchantSettings settings) async {
    await Future<void>.delayed(const Duration(milliseconds: 400));
    _saved = settings;
  }
}
