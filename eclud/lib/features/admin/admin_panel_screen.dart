import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/utils/error_messages.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/admin_merchant.dart';
import '../../l10n/app_localizations.dart';
import '../../routes/route_paths.dart';
import '../../widgets/category_style.dart';
import '../../widgets/content_width.dart';
import '../../widgets/partner_image.dart';
import 'admin_providers.dart';

/// Lista de estabelecimentos para o administrador aprovar ou rejeitar.
class AdminPanelScreen extends ConsumerWidget {
  const AdminPanelScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final merchants = ref.watch(adminMerchantsProvider);

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        leading: BackButton(
          onPressed: () =>
              context.canPop() ? context.pop() : context.go(RoutePaths.profile),
        ),
        title: Text(
          l10n.adminPanel,
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.green,
        foregroundColor: AppColors.onGreen,
        onPressed: () => context.push(RoutePaths.adminNewMerchant),
        icon: const Icon(Icons.add_business_outlined),
        label: Text(l10n.addMerchant),
      ),
      body: merchants.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(errorMessage(l10n, e)),
              TextButton(
                onPressed: () => ref.invalidate(adminMerchantsProvider),
                child: Text(l10n.retry),
              ),
            ],
          ),
        ),
        data: (items) => items.isEmpty
            ? Center(child: Text(l10n.noMerchants))
            : ContentWidth(
                child: ListView.separated(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 96),
                  itemCount: items.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (_, i) => _MerchantTile(item: items[i]),
                ),
              ),
      ),
    );
  }
}

class _MerchantTile extends ConsumerWidget {
  const _MerchantTile({required this.item});

  final AdminMerchant item;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final p = item.partner;
    final (statusLabel, statusColor) = switch (item.status) {
      MerchantStatus.pending => (l10n.statusPending, AppColors.gold),
      MerchantStatus.approved => (l10n.statusApproved, AppColors.green),
      MerchantStatus.rejected => (l10n.statusRejected, AppColors.danger),
    };

    Future<void> setStatus(MerchantStatus status) async {
      final messenger = ScaffoldMessenger.of(context);
      try {
        await ref.read(adminMerchantsProvider.notifier).setStatus(p.id, status);
      } catch (e) {
        messenger.showSnackBar(SnackBar(content: Text(errorMessage(l10n, e))));
      }
    }

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              PartnerImage.of(p, size: 48),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      p.name,
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    Text(
                      '${p.category.label(l10n)} • ${p.priceLabel} • '
                      '${Formatters.percent(p.discountPercent)}',
                      style: const TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 12.5,
                      ),
                    ),
                    Text(
                      '${p.city} · ${item.ownerEmail ?? '—'}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 12.5,
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                statusLabel,
                style: TextStyle(
                  color: statusColor,
                  fontWeight: FontWeight.w700,
                  fontSize: 12.5,
                ),
              ),
            ],
          ),
          Align(
            alignment: Alignment.centerRight,
            child: Wrap(
              spacing: 8,
              children: [
                if (item.status != MerchantStatus.rejected)
                  TextButton(
                    onPressed: () => setStatus(MerchantStatus.rejected),
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.danger,
                    ),
                    child: Text(l10n.reject),
                  ),
                if (item.status != MerchantStatus.approved)
                  FilledButton(
                    onPressed: () => setStatus(MerchantStatus.approved),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.green,
                      foregroundColor: AppColors.onGreen,
                    ),
                    child: Text(l10n.approve),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
