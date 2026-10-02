import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_colors.dart';
import '../../core/utils/external_links.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/partner.dart';
import '../../l10n/app_localizations.dart';
import '../../routes/route_paths.dart';
import '../../widgets/category_style.dart';
import '../../widgets/content_width.dart';
import '../../widgets/discount_badge.dart';
import '../../widgets/primary_button.dart';
import '../favorites/favorite_providers.dart';
import '../partners/partner_providers.dart';

/// Tela 4 — detalhes do parceiro: endereço, cardápio e regra do desconto.
class PartnerDetailScreen extends ConsumerWidget {
  const PartnerDetailScreen({super.key, required this.partnerId});

  final String partnerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final result = ref.watch(partnerByIdProvider(partnerId));

    return Scaffold(
      body: result.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, _) => _Message(
          text: l10n.loadError,
          action: TextButton(
            onPressed: () => ref.invalidate(nearbyPartnersProvider),
            child: Text(l10n.retry),
          ),
        ),
        data: (item) => item == null
            ? _Message(text: l10n.partnerNotFound)
            : ContentWidth(child: _Details(item: item)),
      ),
    );
  }
}

class _Details extends ConsumerWidget {
  const _Details({required this.item});

  final NearbyPartner item;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context).toLanguageTag();
    final partner = item.partner;
    final menuUrl = partner.menuUrl;

    return Column(
      children: [
        Expanded(
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(child: _Header(partner: partner)),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
                sliver: SliverList.list(
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                partner.name,
                                style: const TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.w800,
                                  height: 1.15,
                                ),
                              ),
                              const SizedBox(height: 6),
                              _Rating(partner: partner),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        DiscountBadge(percent: partner.discountPercent),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Text(
                          '${partner.category.label(l10n)} • '
                          '${partner.priceLabel}',
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                        const Spacer(),
                        const Icon(
                          Icons.place_outlined,
                          size: 16,
                          color: AppColors.textMuted,
                        ),
                        const SizedBox(width: 3),
                        Text(
                          Formatters.distance(item.distanceMeters, locale),
                          style: const TextStyle(color: AppColors.textMuted),
                        ),
                      ],
                    ),
                    const _Separator(),
                    _InfoRow(
                      icon: Icons.storefront_outlined,
                      title: l10n.address,
                      subtitle:
                          '${partner.address}\n'
                          '${partner.city}, ${partner.country}',
                      trailing: Icons.directions_outlined,
                      trailingTooltip: l10n.howToGetThere,
                      onTap: () => ExternalLinks.open(
                        context,
                        ExternalLinks.directions(partner.location),
                        errorMessage: l10n.linkError,
                      ),
                    ),
                    if (menuUrl != null) ...[
                      const _Separator(),
                      _InfoRow(
                        icon: Icons.menu_book_outlined,
                        title: l10n.menu,
                        subtitle: l10n.seeExternalMenu,
                        trailing: Icons.open_in_new,
                        trailingTooltip: l10n.seeMenu,
                        onTap: () => ExternalLinks.open(
                          context,
                          menuUrl,
                          errorMessage: l10n.linkError,
                        ),
                      ),
                    ],
                    const SizedBox(height: 20),
                    _RuleCard(
                      text:
                          partner.discountRule ??
                          l10n.defaultDiscountRule(
                            Formatters.percent(partner.discountPercent),
                          ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
            child: PrimaryButton(
              label: l10n.redeemDiscount,
              onPressed: () => context.push(RoutePaths.redeem(partner.id)),
            ),
          ),
        ),
      ],
    );
  }
}

class _Header extends ConsumerWidget {
  const _Header({required this.partner});

  final Partner partner;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final isFavorite = ref.watch(
      favoritesProvider.select((ids) => ids.contains(partner.id)),
    );
    final url = partner.imageUrl;
    final placeholder = DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF1C3A2C), AppColors.surfaceHigh, Color(0xFF2B2A16)],
        ),
      ),
      child: Center(
        child: Icon(partner.category.icon, size: 72, color: AppColors.green),
      ),
    );

    return SizedBox(
      height: 240,
      child: Stack(
        fit: StackFit.expand,
        children: [
          url == null
              ? placeholder
              : Image.network(
                  url,
                  fit: BoxFit.cover,
                  errorBuilder: (_, _, _) => placeholder,
                ),
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Color(0x66000000), Colors.transparent],
                stops: [0, 0.5],
              ),
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _CircleButton(
                    icon: Icons.arrow_back,
                    tooltip: l10n.back,
                    onTap: () => context.canPop()
                        ? context.pop()
                        : context.go(RoutePaths.home),
                  ),
                  _CircleButton(
                    icon: isFavorite ? Icons.favorite : Icons.favorite_border,
                    color: isFavorite ? AppColors.gold : AppColors.text,
                    tooltip: isFavorite
                        ? l10n.removeFavorite
                        : l10n.addFavorite,
                    onTap: () =>
                        ref.read(favoritesProvider.notifier).toggle(partner.id),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CircleButton extends StatelessWidget {
  const _CircleButton({
    required this.icon,
    required this.tooltip,
    required this.onTap,
    this.color = AppColors.text,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;
  final Color color;

  @override
  Widget build(BuildContext context) => IconButton(
    tooltip: tooltip,
    onPressed: onTap,
    style: IconButton.styleFrom(backgroundColor: const Color(0x80000000)),
    icon: Icon(icon, color: color),
  );
}

class _Rating extends StatelessWidget {
  const _Rating({required this.partner});

  final Partner partner;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final rating = partner.rating;
    if (rating == null) {
      return Text(
        l10n.noReviewsYet,
        style: const TextStyle(color: AppColors.gold, fontSize: 13),
      );
    }
    final locale = Localizations.localeOf(context).toLanguageTag();
    return Row(
      children: [
        const Icon(Icons.star_rounded, size: 18, color: AppColors.gold),
        const SizedBox(width: 4),
        Text(
          NumberFormat('0.0', locale).format(rating),
          style: const TextStyle(
            fontWeight: FontWeight.w700,
            color: AppColors.green,
          ),
        ),
        const SizedBox(width: 6),
        Text(
          l10n.reviews(partner.reviewCount),
          style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
        ),
      ],
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.trailing,
    required this.trailingTooltip,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final IconData trailing;
  final String trailingTooltip;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppColors.surfaceHigh,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: AppColors.green, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      color: AppColors.textMuted,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
            Tooltip(
              message: trailingTooltip,
              child: Icon(trailing, color: AppColors.green),
            ),
          ],
        ),
      ),
    );
  }
}

class _RuleCard extends StatelessWidget {
  const _RuleCard({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceHigh,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderStrong),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.verified_outlined, color: AppColors.green),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  AppLocalizations.of(context).discountRuleTitle,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    color: AppColors.green,
                  ),
                ),
                const SizedBox(height: 4),
                Text(text, style: const TextStyle(height: 1.45)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Separator extends StatelessWidget {
  const _Separator();

  @override
  Widget build(BuildContext context) =>
      const Divider(color: Color(0x1FFFFFFF), height: 28);
}

class _Message extends StatelessWidget {
  const _Message({required this.text, this.action});

  final String text;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return SafeArea(
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(text, textAlign: TextAlign.center),
              ?action,
              TextButton(
                onPressed: () => context.go(RoutePaths.home),
                child: Text(l10n.back),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
