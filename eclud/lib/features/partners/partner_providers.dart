import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';

import '../../data/models/partner.dart';
import '../../data/models/partner_category.dart';
import '../../data/repositories/partner_repository.dart';
import '../../demo/demo_partner_repository.dart';
import '../location/location_providers.dart';

final partnerRepositoryProvider = Provider<PartnerRepository>(
  (ref) => DemoPartnerRepository(),
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
  return ref
      .watch(nearbyPartnersProvider)
      .whenData((list) => applyFilters(list, category, query));
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
