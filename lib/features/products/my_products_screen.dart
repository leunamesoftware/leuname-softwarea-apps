import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../data/models/product_model.dart';
import '../../data/models/product_status.dart';
import '../../routes/route_paths.dart';
import 'product_providers.dart';

enum _Filter { todos, ativos, pausados, expirados }

/// Gestão dos anúncios do próprio vendedor (Fase 5/8): pausar, reativar,
/// excluir e acompanhar a validade de 40 dias.
class MyProductsScreen extends ConsumerStatefulWidget {
  const MyProductsScreen({super.key});

  @override
  ConsumerState<MyProductsScreen> createState() => _MyProductsScreenState();
}

class _MyProductsScreenState extends ConsumerState<MyProductsScreen> {
  _Filter _filter = _Filter.todos;

  @override
  Widget build(BuildContext context) {
    final productsAsync = ref.watch(myProductsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Meus anúncios'),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: TextButton.icon(
              onPressed: () => context.push(RoutePaths.createProduct),
              icon: const Icon(Icons.add),
              label: const Text('Criar anúncio'),
            ),
          ),
        ],
      ),
      body: productsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) =>
            Center(child: Text('Não foi possível carregar. $error')),
        data: (all) {
          final filtered = _applyFilter(all);
          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _FilterChip(
                        label: 'Todos (${all.length})',
                        selected: _filter == _Filter.todos,
                        onTap: () => setState(() => _filter = _Filter.todos),
                      ),
                      const SizedBox(width: 8),
                      _FilterChip(
                        label: 'Ativos (${_count(all, ProductStatus.active)})',
                        selected: _filter == _Filter.ativos,
                        onTap: () => setState(() => _filter = _Filter.ativos),
                      ),
                      const SizedBox(width: 8),
                      _FilterChip(
                        label:
                            'Pausados (${_count(all, ProductStatus.paused)})',
                        selected: _filter == _Filter.pausados,
                        onTap: () => setState(() => _filter = _Filter.pausados),
                      ),
                      const SizedBox(width: 8),
                      _FilterChip(
                        label:
                            'Expirados (${_count(all, ProductStatus.expired)})',
                        selected: _filter == _Filter.expirados,
                        onTap: () =>
                            setState(() => _filter = _Filter.expirados),
                      ),
                    ],
                  ),
                ),
              ),
              Expanded(
                child: filtered.isEmpty
                    ? Center(
                        child: Text(
                          'Nenhum anúncio nesta categoria.',
                          style: AppTextStyles.bodyRegular.copyWith(
                            color: Colors.grey.shade600,
                          ),
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: filtered.length,
                        itemBuilder: (context, index) =>
                            _ProductManageCard(product: filtered[index]),
                      ),
              ),
            ],
          );
        },
      ),
    );
  }

  int _count(List<ProductModel> products, ProductStatus status) {
    return products.where((p) => _effectiveStatus(p) == status).length;
  }

  ProductStatus _effectiveStatus(ProductModel product) {
    if (product.status == ProductStatus.active && product.isExpired) {
      return ProductStatus.expired;
    }
    return product.status;
  }

  List<ProductModel> _applyFilter(List<ProductModel> products) {
    switch (_filter) {
      case _Filter.todos:
        return products;
      case _Filter.ativos:
        return products
            .where((p) => _effectiveStatus(p) == ProductStatus.active)
            .toList();
      case _Filter.pausados:
        return products
            .where((p) => _effectiveStatus(p) == ProductStatus.paused)
            .toList();
      case _Filter.expirados:
        return products
            .where((p) => _effectiveStatus(p) == ProductStatus.expired)
            .toList();
    }
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onTap(),
      selectedColor: AppColors.secondary,
      labelStyle: TextStyle(
        color: selected ? Colors.white : AppColors.textDark,
      ),
      backgroundColor: AppColors.surfaceMuted,
    );
  }
}

class _ProductManageCard extends ConsumerWidget {
  const _ProductManageCard({required this.product});

  final ProductModel product;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isExpired =
        product.status == ProductStatus.active && product.isExpired;
    final status = isExpired ? ProductStatus.expired : product.status;
    final daysLeft = product.expiresAt
        .difference(DateTime.now())
        .inDays
        .clamp(0, 999);

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey.shade200),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: SizedBox(
                  width: 64,
                  height: 64,
                  child: product.imageUrls.isNotEmpty
                      ? Image.network(
                          product.imageUrls.first,
                          fit: BoxFit.cover,
                        )
                      : Container(color: AppColors.surfaceMuted),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.title,
                      style: AppTextStyles.bodyRegular.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      'R\$ ${product.price.toStringAsFixed(2)}',
                      style: AppTextStyles.titleSemiBold.copyWith(
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  _StatusBadge(status: status),
                  const SizedBox(height: 4),
                  Text(
                    status == ProductStatus.expired
                        ? 'Expirado'
                        : '$daysLeft dias restantes',
                    style: AppTextStyles.caption,
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Edição de anúncio — em breve.'),
                    ),
                  ),
                  icon: const Icon(Icons.edit_outlined, size: 16),
                  label: const Text('Editar'),
                ),
              ),
              const SizedBox(width: 8),
              if (status != ProductStatus.expired)
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      final repo = ref.read(productRepositoryProvider);
                      if (product.status == ProductStatus.active) {
                        repo.pause(product.id);
                      } else {
                        repo.activate(product.id);
                      }
                    },
                    icon: Icon(
                      product.status == ProductStatus.active
                          ? Icons.pause
                          : Icons.play_arrow,
                      size: 16,
                    ),
                    label: Text(
                      product.status == ProductStatus.active
                          ? 'Pausar'
                          : 'Ativar',
                    ),
                  ),
                ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _confirmDelete(context, ref),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.danger,
                    side: const BorderSide(color: AppColors.danger),
                  ),
                  icon: const Icon(Icons.delete_outline, size: 16),
                  label: const Text('Excluir'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _confirmDelete(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Excluir anúncio?'),
        content: const Text('Essa ação não pode ser desfeita.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text(
              'Excluir',
              style: TextStyle(color: AppColors.danger),
            ),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await ref.read(productRepositoryProvider).delete(product.id);
    }
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});

  final ProductStatus status;

  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (status) {
      ProductStatus.active => ('Ativo', AppColors.success),
      ProductStatus.paused => ('Pausado', AppColors.warning),
      ProductStatus.expired => ('Expirado', Colors.grey),
      ProductStatus.sold => ('Vendido', AppColors.secondary),
      ProductStatus.soldOut => ('Esgotado', AppColors.secondary),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
