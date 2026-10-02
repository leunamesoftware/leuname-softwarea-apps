import '../data/models/admin_merchant.dart';
import '../data/models/partner.dart';
import '../data/repositories/admin_repository.dart';
import 'demo_partner_repository.dart';

/// Administração de demonstração, só na memória.
class DemoAdminRepository implements AdminRepository {
  final List<AdminMerchant> _items = [
    for (final p in DemoPartnerRepository.partners)
      AdminMerchant(
        partner: p,
        status: MerchantStatus.approved,
        isActive: true,
        ownerEmail: 'comercio+${p.id}@demo.es',
      ),
  ];

  @override
  Future<List<AdminMerchant>> fetchMerchants() async => List.of(_items);

  @override
  Future<void> createMerchant(NewMerchant m) async {
    _items.insert(
      0,
      AdminMerchant(
        partner: Partner(
          id: 'demo-${DateTime.now().millisecondsSinceEpoch}',
          name: m.name,
          category: m.category,
          priceLevel: m.priceLevel,
          discountPercent: m.discountPercent,
          location: m.location,
          address: m.address,
          city: m.city,
          country: m.country,
          discountRule: m.discountRule,
          menuUrl: m.menuUrl,
          imageUrl: m.imageUrl,
        ),
        status: MerchantStatus.approved,
        isActive: true,
        ownerEmail: m.ownerEmail,
      ),
    );
  }

  @override
  Future<void> setStatus(String merchantId, MerchantStatus status) async {
    final i = _items.indexWhere((m) => m.partner.id == merchantId);
    if (i != -1) _items[i] = _items[i].withStatus(status);
  }
}
