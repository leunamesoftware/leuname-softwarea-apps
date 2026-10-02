import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/merchant_dashboard.dart';
import '../../l10n/app_localizations.dart';
import '../../routes/route_paths.dart';
import '../../widgets/content_width.dart';
import '../../widgets/partner_image.dart';
import 'merchant_providers.dart';
import 'widgets/daily_bar_chart.dart';
import 'widgets/merchant_settings_form.dart';

/// Tela 8 — painel do lojista: resumo do mês, cupons e ajustes.
class MerchantPanelScreen extends ConsumerStatefulWidget {
  const MerchantPanelScreen({super.key});

  @override
  ConsumerState<MerchantPanelScreen> createState() =>
      _MerchantPanelScreenState();
}

class _MerchantPanelScreenState extends ConsumerState<MerchantPanelScreen> {
  int _tab = 0;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final dashboard = ref.watch(merchantDashboardProvider);

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        leading: BackButton(
          onPressed: () =>
              context.canPop() ? context.pop() : context.go(RoutePaths.profile),
        ),
        title: Text(
          l10n.merchantPanel,
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
      body: dashboard.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(l10n.loadError),
              TextButton(
                onPressed: () => ref.invalidate(merchantDashboardProvider),
                child: Text(l10n.retry),
              ),
            ],
          ),
        ),
        data: (data) => ContentWidth(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 32),
            children: [
              _StoreHeader(data: data),
              const SizedBox(height: 16),
              _Tabs(
                labels: [l10n.tabSummary, l10n.tabCoupons, l10n.tabSettings],
                selected: _tab,
                onSelected: (i) => setState(() => _tab = i),
              ),
              const SizedBox(height: 20),
              switch (_tab) {
                0 => _Summary(data: data),
                1 => _Coupons(coupons: data.recentCoupons),
                _ => MerchantSettingsForm(data: data),
              },
            ],
          ),
        ),
      ),
    );
  }
}

class _StoreHeader extends StatelessWidget {
  const _StoreHeader({required this.data});

  final MerchantDashboard data;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final color = data.isActive ? AppColors.green : AppColors.textMuted;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          PartnerImage.of(data.partner, size: 52),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              data.partner.name,
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: color.withValues(alpha: 0.5)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  data.isActive ? Icons.check_circle : Icons.pause_circle,
                  size: 14,
                  color: color,
                ),
                const SizedBox(width: 4),
                Text(
                  data.isActive ? l10n.statusActive : l10n.statusPaused,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Tabs extends StatelessWidget {
  const _Tabs({
    required this.labels,
    required this.selected,
    required this.onSelected,
  });

  final List<String> labels;
  final int selected;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (var i = 0; i < labels.length; i++) ...[
          if (i > 0) const SizedBox(width: 8),
          Expanded(
            child: Semantics(
              selected: i == selected,
              button: true,
              child: Material(
                color: i == selected ? AppColors.green : AppColors.surface,
                shape: StadiumBorder(
                  side: BorderSide(
                    color: i == selected ? AppColors.green : AppColors.border,
                  ),
                ),
                child: InkWell(
                  customBorder: const StadiumBorder(),
                  onTap: () => onSelected(i),
                  child: SizedBox(
                    height: 42,
                    child: Center(
                      child: Text(
                        labels[i],
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: i == selected
                              ? FontWeight.w700
                              : FontWeight.w500,
                          color: i == selected
                              ? AppColors.onGreen
                              : AppColors.text,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }
}

class _Summary extends StatelessWidget {
  const _Summary({required this.data});

  final MerchantDashboard data;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context).toLanguageTag();
    final number = NumberFormat.decimalPattern(locale);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          l10n.thisMonth,
          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 12),
        _StatRow(
          icon: Icons.confirmation_number_outlined,
          label: l10n.validatedCoupons,
          value: number.format(data.validatedCoupons),
        ),
        _StatRow(
          icon: Icons.euro_rounded,
          label: l10n.discountGranted,
          value: Formatters.price(data.discountGranted, locale),
        ),
        _StatRow(
          icon: Icons.person_add_alt_1_outlined,
          label: l10n.newCustomers,
          value: number.format(data.newCustomers),
        ),
        const SizedBox(height: 16),
        Text(
          l10n.dailyReport,
          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 4),
        DailyBarChart(
          values: data.dailyValidations,
          start: data.chartStart,
          semanticLabel: l10n.dailyReportA11y(
            data.dailyValidations.fold(0, (a, b) => a + b),
          ),
          tooltipFor: (date, count) =>
              l10n.dayValue(DateFormat('d MMM', locale).format(date), count),
        ),
      ],
    );
  }
}

class _StatRow extends StatelessWidget {
  const _StatRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
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
                  label,
                  style: const TextStyle(
                    fontSize: 12.5,
                    color: AppColors.textMuted,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Coupons extends StatelessWidget {
  const _Coupons({required this.coupons});

  final List<MerchantCoupon> coupons;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context).toLanguageTag();
    final dateFormat = DateFormat('dd/MM HH:mm', locale);

    if (coupons.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(24),
        child: Text(
          l10n.noCoupons,
          textAlign: TextAlign.center,
          style: const TextStyle(color: AppColors.textMuted),
        ),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          l10n.recentCoupons,
          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 8),
        for (final c in coupons)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 12),
            decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: Color(0x14FFFFFF))),
            ),
            child: Row(
              children: [
                const Icon(Icons.verified_outlined, color: AppColors.green),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        c.code,
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.5,
                        ),
                      ),
                      Text(
                        dateFormat.format(c.validatedAt),
                        style: const TextStyle(
                          fontSize: 12.5,
                          color: AppColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
                Text(
                  Formatters.percent(c.discountPercent),
                  style: const TextStyle(color: AppColors.textMuted),
                ),
                const SizedBox(width: 16),
                SizedBox(
                  width: 72,
                  child: Text(
                    c.discountAmount == null
                        ? '—'
                        : Formatters.price(c.discountAmount!, locale),
                    textAlign: TextAlign.right,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}
