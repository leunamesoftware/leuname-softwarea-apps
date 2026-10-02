import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/config/app_config.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../l10n/app_localizations.dart';
import '../../routes/route_paths.dart';
import '../../widgets/category_chips.dart';
import '../../widgets/eclud_logo.dart';
import '../../widgets/partner_card.dart';
import '../partners/partner_providers.dart';
import 'widgets/promo_banner.dart';

/// Tela 2 — início: busca, filtros e parceiros mais próximos.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final partners = ref.watch(homePartnersProvider);
    final category = ref.watch(homeCategoryProvider);

    return SafeArea(
      bottom: false,
      child: RefreshIndicator(
        color: AppColors.green,
        onRefresh: () => ref.refresh(nearbyPartnersProvider.future),
        child: CustomScrollView(
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 12, 12, 0),
              sliver: SliverToBoxAdapter(
                child: Row(
                  children: [
                    const EcludLogoRow(),
                    const Spacer(),
                    IconButton(
                      tooltip: l10n.notifications,
                      onPressed: () {},
                      icon: const Icon(Icons.notifications_none_rounded),
                    ),
                  ],
                ),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
              sliver: SliverList.list(
                children: [
                  // Sem login ainda: saudação genérica até existir conta.
                  Text(
                    l10n.greetingAnonymous,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    l10n.homeSubtitle,
                    style: const TextStyle(color: AppColors.textMuted),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    onChanged: ref.read(homeSearchProvider.notifier).update,
                    textInputAction: TextInputAction.search,
                    decoration: InputDecoration(
                      hintText: l10n.searchHint,
                      prefixIcon: const Icon(Icons.search),
                    ),
                  ),
                ],
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.only(top: 16),
              sliver: SliverToBoxAdapter(
                child: CategoryChips(
                  selected: category,
                  onSelected: ref.read(homeCategoryProvider.notifier).select,
                ),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
              sliver: SliverToBoxAdapter(
                child: PromoBanner(
                  title: l10n.promoTitle(
                    Formatters.percent(AppConfig.maxDiscountPercent),
                  ),
                  subtitle: l10n.promoSubtitle,
                ),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 20, 8, 4),
              sliver: SliverToBoxAdapter(
                child: Row(
                  children: [
                    Text(
                      l10n.nearest,
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const Spacer(),
                    TextButton(
                      onPressed: () => context.go(RoutePaths.map),
                      child: Text(
                        l10n.seeMap,
                        style: const TextStyle(
                          color: AppColors.green,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            ...partners.when(
              data: (items) => [
                if (items.isEmpty)
                  _MessageSliver(text: l10n.noResults)
                else
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                    sliver: SliverList.separated(
                      itemCount: items.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 12),
                      itemBuilder: (_, i) => PartnerCard(
                        item: items[i],
                        onTap: () => context.push(
                          RoutePaths.partner(items[i].partner.id),
                        ),
                      ),
                    ),
                  ),
              ],
              loading: () => const [
                SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.all(40),
                    child: Center(child: CircularProgressIndicator()),
                  ),
                ),
              ],
              error: (_, _) => [
                _MessageSliver(
                  text: l10n.loadError,
                  action: TextButton(
                    onPressed: () => ref.invalidate(nearbyPartnersProvider),
                    child: Text(l10n.retry),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _MessageSliver extends StatelessWidget {
  const _MessageSliver({required this.text, this.action});

  final String text;
  final Widget? action;

  @override
  Widget build(BuildContext context) => SliverToBoxAdapter(
    child: Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        children: [
          Text(
            text,
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.textMuted),
          ),
          ?action,
        ],
      ),
    ),
  );
}
