import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../data/models/product_model.dart';
import '../../data/models/product_status.dart';
import '../../routes/route_paths.dart';
import '../auth/auth_providers.dart';
import '../chat/chat_providers.dart';
import 'product_providers.dart';

/// Tela de detalhe do anúncio (Fase 4/5). A ação principal é "Conversar":
/// o LeuPlace não intermedia pagamento entre comprador e vendedor na V1
/// (negociação e combinação acontecem no chat — Fase 7).
class ProductDetailScreen extends ConsumerWidget {
  const ProductDetailScreen({super.key, required this.productId});

  final String productId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final productAsync = ref.watch(productDetailProvider(productId));

    return Scaffold(
      body: productAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) =>
            Center(child: Text('Não foi possível carregar. $error')),
        data: (product) {
          if (product == null) {
            return const Center(
              child: Text('Anúncio não encontrado ou não está mais ativo.'),
            );
          }

          final sellerAsync = ref.watch(userProfileProvider(product.sellerId));
          final isNew = product.condition == ProductCondition.novo;

          return CustomScrollView(
            slivers: [
              SliverAppBar(
                pinned: true,
                backgroundColor: AppColors.background,
                foregroundColor: AppColors.textDark,
                actions: [
                  IconButton(
                    onPressed: () {},
                    icon: const Icon(Icons.favorite_border),
                  ),
                  IconButton(
                    onPressed: () {},
                    icon: const Icon(Icons.share_outlined),
                  ),
                ],
                expandedHeight: 320,
                flexibleSpace: FlexibleSpaceBar(
                  background: Stack(
                    fit: StackFit.expand,
                    children: [
                      product.imageUrls.isNotEmpty
                          ? Image.network(
                              product.imageUrls.first,
                              fit: BoxFit.cover,
                            )
                          : Container(
                              color: AppColors.surfaceMuted,
                              child: const Icon(
                                Icons.image_outlined,
                                size: 48,
                                color: Colors.grey,
                              ),
                            ),
                      Positioned(
                        top: 90,
                        left: 16,
                        child: _Badge(
                          label: isNew ? 'Novo' : 'Usado',
                          color: isNew
                              ? AppColors.success
                              : AppColors.secondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.all(20),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    Text(product.title, style: AppTextStyles.h1),
                    const SizedBox(height: 12),
                    Text(
                      _formatPrice(product.price),
                      style: AppTextStyles.displayBold.copyWith(
                        color: AppColors.primary,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Icon(
                          Icons.location_on,
                          size: 16,
                          color: Colors.grey.shade500,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '${product.region}, ${product.city} - ${product.state}',
                          style: AppTextStyles.bodyRegular.copyWith(
                            color: Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(
                          product.deliveryOption ==
                                  DeliveryOption.deliversInRegion
                              ? Icons.local_shipping_outlined
                              : Icons.storefront_outlined,
                          size: 16,
                          color: Colors.grey.shade500,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          product.deliveryOption ==
                                  DeliveryOption.deliversInRegion
                              ? 'Vendedor entrega em ${product.region}'
                              : 'Retirada no local com o vendedor',
                          style: AppTextStyles.bodyRegular.copyWith(
                            color: Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 32),
                    Text('Descrição', style: AppTextStyles.titleSemiBold),
                    const SizedBox(height: 8),
                    Text(product.description, style: AppTextStyles.bodyRegular),
                    const Divider(height: 32),
                    Text('Vendedor', style: AppTextStyles.titleSemiBold),
                    const SizedBox(height: 8),
                    sellerAsync.when(
                      loading: () => const LinearProgressIndicator(),
                      error: (_, _) =>
                          const Text('Não foi possível carregar o vendedor.'),
                      data: (seller) =>
                          _SellerTile(name: seller?.name ?? 'Vendedor'),
                    ),
                  ]),
                ),
              ),
            ],
          );
        },
      ),
      bottomNavigationBar: productAsync.maybeWhen(
        data: (product) => product == null
            ? null
            : SafeArea(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: ElevatedButton.icon(
                    onPressed: () => _openChat(context, ref, product),
                    icon: const Icon(Icons.chat_bubble_outline),
                    label: const Text('Conversar com o vendedor'),
                  ),
                ),
              ),
        orElse: () => null,
      ),
    );
  }

  Future<void> _openChat(
    BuildContext context,
    WidgetRef ref,
    ProductModel product,
  ) async {
    final myUid = ref.read(currentUidProvider);
    if (myUid == null) return;

    if (myUid == product.sellerId) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Este é o seu próprio anúncio.')),
      );
      return;
    }

    final chatId = await ref
        .read(chatRepositoryProvider)
        .findOrCreateChat(
          productId: product.id,
          buyerId: myUid,
          sellerId: product.sellerId,
        );

    if (context.mounted) context.push(RoutePaths.chatDetail(chatId));
  }

  String _formatPrice(double price) {
    final text = price.toStringAsFixed(2).replaceAll('.', ',');
    final parts = text.split(',');
    final intPart = parts[0].replaceAllMapped(
      RegExp(r'\B(?=(\d{3})+(?!\d))'),
      (m) => '.',
    );
    return 'R\$ $intPart,${parts[1]}';
  }
}

class _Badge extends StatelessWidget {
  const _Badge({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _SellerTile extends StatelessWidget {
  const _SellerTile({required this.name});

  final String name;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const CircleAvatar(
          radius: 22,
          backgroundColor: AppColors.surfaceMuted,
          child: Icon(Icons.person, color: AppColors.primary),
        ),
        const SizedBox(width: 12),
        Text(
          name,
          style: AppTextStyles.bodyRegular.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}
