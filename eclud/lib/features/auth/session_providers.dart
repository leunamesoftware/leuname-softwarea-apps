import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/config/app_config.dart';
import '../../data/api/api_auth_repository.dart';
import '../../data/api/api_client.dart';
import '../../data/api/token_store.dart';
import '../../data/models/app_user.dart';
import '../../data/repositories/auth_repository.dart';
import '../../demo/demo_auth_repository.dart';

final tokenStoreProvider = Provider<TokenStore>((ref) => TokenStore());

final apiClientProvider = Provider<ApiClient>(
  (ref) => ApiClient(
    baseUrl: AppConfig.apiUrl,
    tokens: ref.watch(tokenStoreProvider),
  ),
);

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AppConfig.isDemo
      ? ref.watch(demoAuthRepositoryProvider)
      : ApiAuthRepository(ref.watch(apiClientProvider)),
);

/// Instância única da demonstração (a assinatura simulada fica nela).
final demoAuthRepositoryProvider = Provider<DemoAuthRepository>(
  (ref) => DemoAuthRepository(),
);

/// Usuário logado (`null` = visitante). Começa recuperando a sessão salva.
class Session extends AsyncNotifier<AppUser?> {
  @override
  Future<AppUser?> build() async {
    if (!AppConfig.isDemo) {
      // Sessão expirada em qualquer chamada: volta a ser visitante.
      ref.read(apiClientProvider).onUnauthorized = () {
        ref.read(tokenStoreProvider).clear();
        state = const AsyncData(null);
      };
    }
    return ref.read(authRepositoryProvider).restore();
  }

  Future<void> register(String name, String email, String password) async {
    state = AsyncData(
      await ref
          .read(authRepositoryProvider)
          .register(name: name, email: email, password: password),
    );
  }

  Future<void> login(String email, String password) async {
    state = AsyncData(
      await ref
          .read(authRepositoryProvider)
          .login(email: email, password: password),
    );
  }

  Future<void> resetPassword(String email, String code, String password) async {
    state = AsyncData(
      await ref
          .read(authRepositoryProvider)
          .resetPassword(email: email, code: code, password: password),
    );
  }

  /// Recarrega o perfil (ex.: depois de assinar).
  Future<void> refresh() async {
    final user = await ref.read(authRepositoryProvider).restore();
    if (user != null) state = AsyncData(user);
  }

  Future<void> logout() async {
    await ref.read(authRepositoryProvider).logout();
    state = const AsyncData(null);
  }

  Future<void> deleteAccount() async {
    await ref.read(authRepositoryProvider).deleteAccount();
    state = const AsyncData(null);
  }
}

final sessionProvider = AsyncNotifierProvider<Session, AppUser?>(Session.new);

/// Atalho: usuário atual ou `null` (também durante o carregamento).
final currentUserProvider = Provider<AppUser?>(
  (ref) => ref.watch(sessionProvider).value,
);
