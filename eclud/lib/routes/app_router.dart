import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../data/models/app_user.dart';
import '../features/admin/admin_panel_screen.dart';
import '../features/admin/merchant_form_screen.dart';
import '../features/auth/auth_form.dart';
import '../features/auth/login_screen.dart';
import '../features/auth/register_screen.dart';
import '../features/auth/session_providers.dart';
import '../features/favorites/favorites_screen.dart';
import '../features/home/home_screen.dart';
import '../features/map/map_screen.dart';
import '../features/merchant/merchant_panel_screen.dart';
import '../features/onboarding/onboarding_screen.dart';
import '../features/partner_detail/partner_detail_screen.dart';
import '../features/profile/profile_screen.dart';
import '../features/redeem/redeem_screen.dart';
import '../features/savings/savings_screen.dart';
import '../features/subscription/subscription_screen.dart';
import '../features/auth/forgot_password_screen.dart';
import '../widgets/app_shell.dart';
import 'route_paths.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  // Reavalia os redirecionamentos quando muda quem está logado (ou o papel),
  // não a cada atualização do perfil — isso desfaria navegações em curso.
  final sessionChanges = ValueNotifier(0);
  ref.listen(
    sessionProvider.select(
      (s) => (s.isLoading && !s.hasValue, s.value?.id, s.value?.role),
    ),
    (_, _) => sessionChanges.value++,
  );

  final router = GoRouter(
    initialLocation: RoutePaths.onboarding,
    refreshListenable: sessionChanges,
    redirect: (_, state) => authRedirect(
      session: ref.read(sessionProvider),
      location: state.matchedLocation,
      uri: state.uri,
    ),
    routes: [
      GoRoute(
        path: RoutePaths.onboarding,
        builder: (_, _) => const OnboardingScreen(),
      ),
      GoRoute(
        path: RoutePaths.register,
        builder: (_, _) => const RegisterScreen(),
      ),
      GoRoute(path: RoutePaths.login, builder: (_, _) => const LoginScreen()),
      GoRoute(
        path: RoutePaths.subscribe,
        builder: (_, _) => const SubscriptionScreen(),
      ),
      GoRoute(
        path: RoutePaths.forgotPassword,
        builder: (_, _) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: RoutePaths.favorites,
        builder: (_, _) => const FavoritesScreen(),
      ),
      GoRoute(
        path: RoutePaths.merchant,
        builder: (_, _) => const MerchantPanelScreen(),
      ),
      GoRoute(
        path: RoutePaths.admin,
        builder: (_, _) => const AdminPanelScreen(),
        routes: [
          GoRoute(path: 'nuevo', builder: (_, _) => const MerchantFormScreen()),
        ],
      ),
      GoRoute(
        path: '/local/:id',
        builder: (_, state) =>
            PartnerDetailScreen(partnerId: state.pathParameters['id']!),
        routes: [
          GoRoute(
            path: 'canjear',
            builder: (_, state) =>
                RedeemScreen(partnerId: state.pathParameters['id']!),
          ),
        ],
      ),
      StatefulShellRoute.indexedStack(
        builder: (_, _, shell) => AppShell(navigationShell: shell),
        branches: [
          _branch(RoutePaths.home, const HomeScreen()),
          _branch(RoutePaths.map, const MapScreen()),
          _branch(RoutePaths.savings, const SavingsScreen()),
          _branch(RoutePaths.profile, const ProfileScreen()),
        ],
      ),
    ],
  );
  ref.onDispose(() {
    router.dispose();
    sessionChanges.dispose();
  });
  return router;
});

StatefulShellBranch _branch(String path, Widget screen) => StatefulShellBranch(
  routes: [GoRoute(path: path, builder: (_, _) => screen)],
);

/// Regras de acesso:
/// - visitantes podem explorar parceiros e mapa (exigência da App Store:
///   não pedir conta para o que não precisa de conta);
/// - usar desconto exige login; o painel exige conta de lojista e a
///   administração, conta de administrador;
/// - quem já entrou não volta para as telas de boas-vindas/login.
@visibleForTesting
String? authRedirect({
  required AsyncValue<AppUser?> session,
  required String location,
  required Uri uri,
}) {
  if (session.isLoading && !session.hasValue) return null;
  final user = session.value;

  const accountPages = {
    RoutePaths.onboarding,
    RoutePaths.register,
    RoutePaths.login,
    RoutePaths.forgotPassword,
  };
  if (user != null && accountPages.contains(location)) {
    // Só caminhos internos, para não virar redirecionamento aberto.
    final next = uri.queryParameters['next'];
    return isSafeNext(next) ? next : RoutePaths.home;
  }

  if (user == null && location.endsWith('/canjear')) {
    return Uri(
      path: RoutePaths.login,
      queryParameters: {'next': uri.toString()},
    ).toString();
  }

  if (location == RoutePaths.merchant && !(user?.isMerchant ?? false)) {
    return user == null ? RoutePaths.login : RoutePaths.home;
  }
  if (location.startsWith(RoutePaths.admin) && !(user?.isAdmin ?? false)) {
    return user == null ? RoutePaths.login : RoutePaths.home;
  }
  return null;
}
