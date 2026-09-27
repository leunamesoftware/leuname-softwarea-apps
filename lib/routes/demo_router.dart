import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/categories/categories_screen.dart';
import '../features/chat/chat_detail_screen.dart';
import '../features/chat/chat_list_screen.dart';
import '../features/credits/credits_screen.dart';
import '../features/home/home_screen.dart';
import '../features/products/create_product_screen.dart';
import '../features/products/my_products_screen.dart';
import '../features/products/product_detail_screen.dart';
import '../features/profile/profile_screen.dart';
import '../features/search/search_screen.dart';
import '../widgets/app_shell.dart';
import 'route_paths.dart';

/// Roteador da prévia de demonstração: pula a autenticação (não há backend
/// real) e vai direto para o shell principal.
final demoRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: RoutePaths.home,
    routes: [
      GoRoute(
        path: RoutePaths.categories,
        builder: (_, _) => const CategoriesScreen(),
      ),
      GoRoute(
        path: '/produto/:id',
        builder: (_, state) =>
            ProductDetailScreen(productId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/chat/:id',
        builder: (_, state) =>
            ChatDetailScreen(chatId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: RoutePaths.createProduct,
        builder: (_, _) => const CreateProductScreen(),
      ),
      GoRoute(
        path: RoutePaths.credits,
        builder: (_, _) => const CreditsScreen(),
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
                path: RoutePaths.myProducts,
                builder: (_, _) => const MyProductsScreen(),
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
