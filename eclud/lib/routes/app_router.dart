import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/home/home_screen.dart';
import '../features/map/map_screen.dart';
import '../features/merchant/merchant_panel_screen.dart';
import '../features/onboarding/onboarding_screen.dart';
import '../features/partner_detail/partner_detail_screen.dart';
import '../features/redeem/redeem_screen.dart';
import '../features/savings/savings_screen.dart';
import '../features/placeholders/placeholder_screens.dart';
import '../widgets/app_shell.dart';
import 'route_paths.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final router = GoRouter(
    initialLocation: RoutePaths.onboarding,
    routes: [
      GoRoute(
        path: RoutePaths.onboarding,
        builder: (_, _) => const OnboardingScreen(),
      ),
      GoRoute(
        path: RoutePaths.merchant,
        builder: (_, _) => const MerchantPanelScreen(),
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
  ref.onDispose(router.dispose);
  return router;
});

StatefulShellBranch _branch(String path, Widget screen) => StatefulShellBranch(
  routes: [GoRoute(path: path, builder: (_, _) => screen)],
);
