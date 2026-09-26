import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../routes/route_paths.dart';
import '../../widgets/product_card.dart';
import '../categories/category_providers.dart';
import '../products/product_providers.dart';

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: ref.read(searchQueryProvider));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _submit() {
    ref.read(categoryFilterProvider.notifier).state = null;
    ref.read(searchQueryProvider.notifier).state = _controller.text;
  }

  @override
  Widget build(BuildContext context) {
    final resultsAsync = ref.watch(searchResultsProvider);
    final categoryId = ref.watch(categoryFilterProvider);
    final categoriesAsync = ref.watch(categoriesProvider);
    final categoryName = categoryId == null
        ? null
        : categoriesAsync.value
              ?.where((c) => c.id == categoryId)
              .firstOrNull
              ?.name;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Row(
          children: [
            Expanded(
              child: TextField(
                controller: _controller,
                textInputAction: TextInputAction.search,
                onSubmitted: (_) => _submit(),
                decoration: InputDecoration(
                  hintText: 'O que você está procurando?',
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: _controller.text.isEmpty
                      ? null
                      : IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () {
                            _controller.clear();
                            _submit();
                          },
                        ),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
            ),
            const SizedBox(width: 8),
            ElevatedButton(
              onPressed: _submit,
              style: ElevatedButton.styleFrom(minimumSize: const Size(84, 44)),
              child: const Text('Buscar'),
            ),
          ],
        ),
        titleSpacing: 12,
      ),
      body: Column(
        children: [
          if (categoryName != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Chip(
                  label: Text('Categoria: $categoryName'),
                  onDeleted: () =>
                      ref.read(categoryFilterProvider.notifier).state = null,
                  backgroundColor: AppColors.surfaceMuted,
                ),
              ),
            ),
          Expanded(
            child: resultsAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) =>
                  Center(child: Text('Não foi possível buscar. $error')),
              data: (products) {
                if (products.isEmpty) {
                  return const _EmptySearchState();
                }
                return CustomScrollView(
                  slivers: [
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                      sliver: SliverToBoxAdapter(
                        child: Text(
                          '${products.length} anúncio(s) encontrado(s)',
                          style: AppTextStyles.bodyRegular.copyWith(
                            color: Colors.grey.shade600,
                          ),
                        ),
                      ),
                    ),
                    SliverPadding(
                      padding: const EdgeInsets.all(16),
                      sliver: SliverGrid(
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              mainAxisSpacing: 14,
                              crossAxisSpacing: 14,
                              childAspectRatio: 0.68,
                            ),
                        delegate: SliverChildBuilderDelegate((context, index) {
                          final product = products[index];
                          return ProductCard(
                            product: product,
                            onTap: () => context.push(
                              RoutePaths.productDetail(product.id),
                            ),
                          );
                        }, childCount: products.length),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptySearchState extends StatelessWidget {
  const _EmptySearchState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.search_off, size: 56, color: Colors.grey),
            const SizedBox(height: 16),
            Text('Nenhum anúncio encontrado', style: AppTextStyles.h2),
            const SizedBox(height: 8),
            Text(
              'Tente outra palavra-chave ou categoria, ou seja o primeiro a\nanunciar nessa região.',
              textAlign: TextAlign.center,
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
