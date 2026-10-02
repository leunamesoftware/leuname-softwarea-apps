import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/config/app_config.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/partner_category.dart';
import '../../l10n/app_localizations.dart';
import '../../routes/route_paths.dart';
import '../../widgets/category_style.dart';
import '../../widgets/eclud_logo.dart';
import '../../widgets/primary_button.dart';

/// Tela 1 — apresentação do clube, preço e acesso ao cadastro.
class OnboardingScreen extends StatelessWidget {
  const OnboardingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment(0, -1.1),
            radius: 1.2,
            colors: [Color(0xFF2A2417), AppColors.background],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 440),
                child: Column(
                  children: [
                    const EcludMark(size: 104),
                    const SizedBox(height: 4),
                    const EcludWordmark(fontSize: 56),
                    const SizedBox(height: 10),
                    Text(
                      l10n.tagline,
                      style: const TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 2.4,
                        color: AppColors.gold,
                      ),
                    ),
                    const SizedBox(height: 28),
                    Text.rich(
                      TextSpan(
                        children: [
                          TextSpan(
                            text: l10n.onboardingHeadlineHighlight,
                            style: const TextStyle(color: AppColors.green),
                          ),
                          TextSpan(text: l10n.onboardingHeadlineRest),
                        ],
                      ),
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        height: 1.22,
                      ),
                    ),
                    const SizedBox(height: 24),
                    const _CategoryRow(),
                    const SizedBox(height: 24),
                    const _PriceCard(),
                    const SizedBox(height: 20),
                    PrimaryButton(
                      label: l10n.startNow,
                      // Cadastro e assinatura entram na próxima etapa.
                      onPressed: () => context.go(RoutePaths.home),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      alignment: WrapAlignment.center,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Text(
                          l10n.haveAccount,
                          style: const TextStyle(color: AppColors.textMuted),
                        ),
                        TextButton(
                          onPressed: () => context.go(RoutePaths.home),
                          child: Text(
                            l10n.signIn,
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              color: AppColors.green,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const Divider(color: Color(0x1FFFFFFF), height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.lock_outline,
                          size: 14,
                          color: AppColors.textMuted,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          l10n.securePayment,
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.textMuted,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    const _PaymentMethods(),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _CategoryRow extends StatelessWidget {
  const _CategoryRow();

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final items = [
      (PartnerCategory.food, l10n.categoryRestaurants),
      (PartnerCategory.cafe, l10n.categoryCafes),
      (PartnerCategory.beauty, l10n.categoryBeauty),
      (PartnerCategory.leisure, l10n.categoryLeisure),
    ];

    return Row(
      children: [
        for (final (category, label) in items)
          Expanded(
            child: Column(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: AppColors.surfaceHigh,
                    borderRadius: BorderRadius.circular(15),
                    border: Border.all(color: AppColors.borderStrong),
                  ),
                  child: Icon(category.icon, color: AppColors.green),
                ),
                const SizedBox(height: 8),
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class _PriceCard extends StatelessWidget {
  const _PriceCard();

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context).toLanguageTag();

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF0F2B1F), Color(0xFF0A1C15)],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.borderStrong),
      ),
      child: Column(
        children: [
          Text(
            l10n.priceFrom,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: AppColors.textMuted,
            ),
          ),
          Text.rich(
            TextSpan(
              children: [
                TextSpan(
                  text: Formatters.price(AppConfig.monthlyPrice, locale),
                ),
                TextSpan(
                  text: l10n.pricePerMonth,
                  style: const TextStyle(fontSize: 22),
                ),
              ],
            ),
            style: const TextStyle(
              fontSize: 48,
              fontWeight: FontWeight.w800,
              color: AppColors.green,
              height: 1.15,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            l10n.priceDescription,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 13,
              height: 1.45,
              color: Color(0xFFCFD8D4),
            ),
          ),
        ],
      ),
    );
  }
}

class _PaymentMethods extends StatelessWidget {
  const _PaymentMethods();

  @override
  Widget build(BuildContext context) {
    const style = TextStyle(fontSize: 14, fontWeight: FontWeight.w800);
    return const Wrap(
      alignment: WrapAlignment.center,
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: 22,
      runSpacing: 8,
      children: [
        Text(
          'VISA',
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w800,
            fontStyle: FontStyle.italic,
          ),
        ),
        _MastercardMark(),
        Text('Apple Pay', style: style),
        Text('G Pay', style: style),
      ],
    );
  }
}

class _MastercardMark extends StatelessWidget {
  const _MastercardMark();

  @override
  Widget build(BuildContext context) {
    return const SizedBox(
      width: 32,
      height: 20,
      child: Stack(
        children: [
          Positioned(left: 0, child: _Dot(Color(0xFFEB001B))),
          Positioned(left: 12, child: _Dot(Color(0xE6F79E1B))),
        ],
      ),
    );
  }
}

class _Dot extends StatelessWidget {
  const _Dot(this.color);

  final Color color;

  @override
  Widget build(BuildContext context) => Container(
    width: 20,
    height: 20,
    decoration: BoxDecoration(color: color, shape: BoxShape.circle),
  );
}
