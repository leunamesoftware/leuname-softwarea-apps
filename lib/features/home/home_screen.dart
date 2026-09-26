import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../routes/route_paths.dart';
import '../../widgets/app_header.dart';
import '../../widgets/category_icon.dart';
import '../../widgets/product_card.dart';
import '../categories/category_providers.dart';
import '../products/product_providers.dart';

/// Home do LeuPlace: busca, categorias e anúncios próximos (Fase 4).
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final categoriesAsync = ref.watch(categoriesProvider);
    final nearbyAsync = ref.watch(nearbyProductsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: const AppHeader(),
      body: CustomScrollView(
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
            sliver: SliverToBoxAdapter(
              child: _SearchBarLauncher(
                onTap: () => context.push(RoutePaths.search),
              ),
            ),
          ),
          const SliverPadding(
            padding: EdgeInsets.fromLTRB(16, 16, 16, 0),
            sliver: SliverToBoxAdapter(child: _PromoBanner()),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
            sliver: SliverToBoxAdapter(
              child: categoriesAsync.when(
                loading: () => const SizedBox(
                  height: 80,
                  child: Center(child: CircularProgressIndicator()),
                ),
                error: (error, _) =>
                    Text('Não foi possível carregar categorias. $error'),
                data: (categories) =>
                    _CategoriesPreview(categories: categories),
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
            sliver: SliverToBoxAdapter(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Anúncios perto de você', style: AppTextStyles.h2),
                  TextButton(
                    onPressed: () => context.push(RoutePaths.search),
                    child: const Text('Ver todos →'),
                  ),
                ],
              ),
            ),
          ),
          nearbyAsync.when(
            loading: () => const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: Center(child: CircularProgressIndicator()),
              ),
            ),
            error: (error, _) => SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text('Não foi possível carregar anúncios. $error'),
              ),
            ),
            data: (products) {
              if (products.isEmpty) {
                return const SliverToBoxAdapter(child: _EmptyNearbyState());
              }
              return SliverPadding(
                padding: const EdgeInsets.all(16),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 14,
                    crossAxisSpacing: 14,
                    childAspectRatio: 0.68,
                  ),
                  delegate: SliverChildBuilderDelegate((context, index) {
                    final product = products[index];
                    return ProductCard(
                      product: product,
                      onTap: () =>
                          context.push(RoutePaths.productDetail(product.id)),
                    );
                  }, childCount: products.length),
                ),
              );
            },
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 24)),
        ],
      ),
    );
  }
}

class _SearchBarLauncher extends StatelessWidget {
  const _SearchBarLauncher({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: AppColors.surfaceMuted,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          children: [
            const Icon(Icons.search, color: Colors.grey),
            const SizedBox(width: 10),
            Text(
              'O que você está procurando?',
              style: AppTextStyles.bodyRegular.copyWith(
                color: Colors.grey.shade600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PromoBanner extends StatelessWidget {
  const _PromoBanner();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.primary, Color(0xFFE0470D)],
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Compre e venda\nperto de você',
            style: TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Produtos novos e usados com segurança.',
            style: TextStyle(color: Colors.white70, fontSize: 13),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () {},
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: AppColors.primary,
              minimumSize: const Size(140, 40),
            ),
            child: const Text('Ver ofertas →'),
          ),
        ],
      ),
    );
  }
}

class _CategoriesPreview extends StatelessWidget {
  const _CategoriesPreview({required this.categories});

  final List categories;

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: categories.length + 1,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 4,
        mainAxisSpacing: 12,
        crossAxisSpacing: 8,
        childAspectRatio: 0.85,
      ),
      itemBuilder: (context, index) {
        if (index == categories.length) {
          return _CategoryChip(
            icon: Icons.apps,
            label: 'Mais\nCategorias',
            color: AppColors.secondary,
            onTap: () => context.push(RoutePaths.categories),
          );
        }
        final category = categories[index];
        return _CategoryChip(
          icon: categoryIconFor(category.icon),
          label: category.name,
          color: index.isEven ? AppColors.primary : AppColors.secondary,
          onTap: () => context.push(RoutePaths.categories),
        );
      },
    );
  }
}

class _CategoryChip extends StatelessWidget {
  const _CategoryChip({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(height: 6),
          Text(
            label,
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: AppTextStyles.caption,
          ),
        ],
      ),
    );
  }
}

class _EmptyNearbyState extends StatelessWidget {
  const _EmptyNearbyState();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        children: [
          const Icon(Icons.storefront_outlined, size: 48, color: Colors.grey),
          const SizedBox(height: 12),
          Text(
            'Nenhum anúncio por aqui ainda',
            style: AppTextStyles.titleSemiBold,
          ),
          const SizedBox(height: 4),
          Text(
            'Seja o primeiro a vender na sua região.',
            style: AppTextStyles.bodyRegular.copyWith(
              color: Colors.grey.shade600,
            ),
          ),
        ],
      ),
    );
  }
}
