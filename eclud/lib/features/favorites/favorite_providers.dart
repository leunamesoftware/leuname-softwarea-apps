import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../data/models/partner.dart';
import '../partners/partner_providers.dart';

/// Parceiros favoritos, guardados no próprio aparelho.
class Favorites extends Notifier<Set<String>> {
  static const _key = 'favorite_partner_ids';

  @override
  Set<String> build() {
    _load();
    return const {};
  }

  Future<void> _load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getStringList(_key);
      if (saved != null) state = {...state, ...saved};
    } catch (_) {
      // Sem armazenamento disponível: favoritos só valem nesta sessão.
    }
  }

  Future<void> toggle(String partnerId) async {
    state = state.contains(partnerId)
        ? ({...state}..remove(partnerId))
        : {...state, partnerId};
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setStringList(_key, state.toList());
    } catch (_) {}
  }
}

final favoritesProvider = NotifierProvider<Favorites, Set<String>>(
  Favorites.new,
);

/// Parceiros favoritos com distância, do mais próximo ao mais distante.
final favoritePartnersProvider = Provider<AsyncValue<List<NearbyPartner>>>((
  ref,
) {
  final ids = ref.watch(favoritesProvider);
  return ref
      .watch(nearbyPartnersProvider)
      .whenData(
        (list) => list.where((n) => ids.contains(n.partner.id)).toList(),
      );
});
