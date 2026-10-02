import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Parceiros favoritos do usuário. Fica só na memória por enquanto;
/// passa a ser salvo na conta quando o backend estiver pronto.
class Favorites extends Notifier<Set<String>> {
  @override
  Set<String> build() => const {};

  void toggle(String partnerId) {
    state = state.contains(partnerId)
        ? ({...state}..remove(partnerId))
        : {...state, partnerId};
  }
}

final favoritesProvider = NotifierProvider<Favorites, Set<String>>(
  Favorites.new,
);
