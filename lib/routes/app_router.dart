import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/auth_providers.dart';
import '../features/auth/login_screen.dart';
import '../features/auth/register_screen.dart';
import '../features/auth/welcome_screen.dart';
import '../features/chat/chat_list_screen.dart';
import '../features/home/home_screen.dart';
import '../features/products/create_product_screen.dart';
import '../features/profile/profile_screen.dart';
import '../features/search/search_screen.dart';
import '../features/splash/splash_screen.dart';
import '../widgets/app_shell.dart';
import 'go_router_refresh_stream.dart';
import 'route_paths.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final refreshStream = GoRouterRefreshStream(
    ref.watch(authRepositoryProvider).authStateChanges,
  );
  ref.onDispose(refreshStream.dispose);

  bool isAuthRoute(String path) =>
      path == RoutePaths.welcome ||
      path == RoutePaths.login ||
      path == RoutePaths.register;

  return GoRouter(
    initialLocation: RoutePaths.splash,
    refreshListenable: refreshStream,
    redirect: (context, state) {
      final authState = ref.read(authStateChangesProvider);
      final currentPath = state.matchedLocation;

      if (authState.isLoading) {
        return currentPath == RoutePaths.splash ? null : RoutePaths.splash;
      }

      final isLoggedIn = authState.valueOrNull != null;

      if (!isLoggedIn) {
        return isAuthRoute(currentPath) ? null : RoutePaths.welcome;
      }

      if (isAuthRoute(currentPath) || currentPath == RoutePaths.splash) {
        return RoutePaths.home;
      }

      return null;
    },
    routes: [
      GoRoute(path: RoutePaths.splash, builder: (_, _) => const SplashScreen()),
      GoRoute(
        path: RoutePaths.welcome,
        builder: (_, _) => const WelcomeScreen(),
      ),
      GoRoute(path: RoutePaths.login, builder: (_, _) => const LoginScreen()),
      GoRoute(
        path: RoutePaths.register,
        builder: (_, _) => const RegisterScreen(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) => AppShell(
          currentIndex: navigationShell.currentIndex,
          onTap: (index) => navigationShell.goBranch(
            index,
            initialLocation: index == navigationShell.currentIndex,
          ),
          child: navigationShell,
        ),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.home,
                builder: (_, _) => const HomeScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.search,
                builder: (_, _) => const SearchScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.createProduct,
                builder: (_, _) => const CreateProductScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.chat,
                builder: (_, _) => const ChatListScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.profile,
                builder: (_, _) => const ProfileScreen(),
              ),
            ],
          ),
        ],
      ),
    ],
  );
});
