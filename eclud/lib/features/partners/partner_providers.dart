import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';

import '../../core/config/app_config.dart';
import '../../data/api/api_partner_repository.dart';
import '../../data/api/api_redemption_repository.dart';
import '../../data/models/partner.dart';
import '../../data/models/partner_category.dart';
import '../../data/repositories/partner_repository.dart';
import '../../data/repositories/redemption_repository.dart';
import '../../demo/demo_partner_repository.dart';
import '../../demo/demo_redemption_repository.dart';
import '../auth/session_providers.dart';
import '../location/location_providers.dart';
import '../savings/savings_providers.dart';

final partnerRepositoryProvider = Provider<PartnerRepository>(
  (ref) => AppConfig.isDemo
      ? DemoPartnerRepository()
      : ApiPartnerRepository(ref.watch(apiClientProvider)),
);

/// Parceiros ordenados do mais próximo ao mais distante do usuário.
final nearbyPartnersProvider = FutureProvider<List<NearbyPartner>>((ref) async {
  final partners = await ref.watch(partnerRepositoryProvider).fetchPartners();
  final origin = await ref.watch(userLocationProvider.future);
  const distance = Distance();

  return [
    for (final p in partners)
      NearbyPartner(p, distance.as(LengthUnit.Meter, origin, p.location)),
  ]..sort((a, b) => a.distanceMeters.compareTo(b.distanceMeters));
});

/// Filtro de categoria; `null` significa "Todos".
class CategoryFilter extends Notifier<PartnerCategory?> {
  @override
  PartnerCategory? build() => null;

  void select(PartnerCategory? category) => state = category;
}

class SearchQuery extends Notifier<String> {
  @override
  String build() => '';

  void update(String value) => state = value.trim();
}

enum PartnerSort { distance, discount }

class SortOrder extends Notifier<PartnerSort> {
  @override
  PartnerSort build() => PartnerSort.distance;

  void set(PartnerSort value) => state = value;
}

final homeSortProvider = NotifierProvider<SortOrder, PartnerSort>(
  SortOrder.new,
);

final homeCategoryProvider = NotifierProvider<CategoryFilter, PartnerCategory?>(
  CategoryFilter.new,
);
final homeSearchProvider = NotifierProvider<SearchQuery, String>(
  SearchQuery.new,
);

final mapCategoryProvider = NotifierProvider<CategoryFilter, PartnerCategory?>(
  CategoryFilter.new,
);
final mapSearchProvider = NotifierProvider<SearchQuery, String>(
  SearchQuery.new,
);

List<NearbyPartner> applyFilters(
  List<NearbyPartner> partners,
  PartnerCategory? category,
  String query,
) {
  final q = _normalize(query);
  return partners.where((n) {
    if (category != null && n.partner.category != category) return false;
    if (q.isEmpty) return true;
    return _normalize(n.partner.name).contains(q) ||
        _normalize(n.partner.address).contains(q);
  }).toList();
}

final homePartnersProvider = Provider<AsyncValue<List<NearbyPartner>>>((ref) {
  final category = ref.watch(homeCategoryProvider);
  final query = ref.watch(homeSearchProvider);
  final sort = ref.watch(homeSortProvider);
  return ref.watch(nearbyPartnersProvider).whenData((list) {
    final filtered = applyFilters(list, category, query);
    if (sort == PartnerSort.discount) {
      // Maior desconto primeiro; empate decide pela distância.
      filtered.sort((a, b) {
        final byDiscount = b.partner.discountPercent.compareTo(
          a.partner.discountPercent,
        );
        return byDiscount != 0
            ? byDiscount
            : a.distanceMeters.compareTo(b.distanceMeters);
      });
    }
    return filtered;
  });
});

final mapPartnersProvider = Provider<AsyncValue<List<NearbyPartner>>>((ref) {
  final category = ref.watch(mapCategoryProvider);
  final query = ref.watch(mapSearchProvider);
  return ref
      .watch(nearbyPartnersProvider)
      .whenData((list) => applyFilters(list, category, query));
});

/// Busca sem diferenciar maiúsculas nem acentos ("cafe" encontra "Café").
String _normalize(String value) {
  const from = 'áàäâãéèëêíìïîóòöôõúùüûñç';
  const to = 'aaaaaeeeeiiiiooooouuuunc';
  final lower = value.toLowerCase();
  final buffer = StringBuffer();
  for (final char in lower.split('')) {
    final i = from.indexOf(char);
    buffer.write(i == -1 ? char : to[i]);
  }
  return buffer.toString();
}

/// Um parceiro pelo id, já com a distância; `null` se não existir mais.
final partnerByIdProvider = FutureProvider.family<NearbyPartner?, String>((
  ref,
  id,
) async {
  final partners = await ref.watch(nearbyPartnersProvider.future);
  for (final item in partners) {
    if (item.partner.id == id) return item;
  }
  return null;
});

final redemptionRepositoryProvider = Provider<RedemptionRepository>(
  (ref) => AppConfig.isDemo
      ? DemoRedemptionRepository(
          onRedeemed: ref.watch(demoSavingsRepositoryProvider).record,
          isSubscribed: () => ref.read(demoAuthRepositoryProvider).subscribed,
        )
      : ApiRedemptionRepository(ref.watch(apiClientProvider)),
);
