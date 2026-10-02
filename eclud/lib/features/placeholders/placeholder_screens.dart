import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../l10n/app_localizations.dart';
import '../../routes/route_paths.dart';
import '../../widgets/coming_soon_view.dart';

/// Perfil provisório. Enquanto não há login, dá acesso ao painel do
/// comércio para demonstração; depois ele aparece só para lojistas.
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Column(
      children: [
        Expanded(
          child: ComingSoonView(
            title: l10n.navProfile,
            icon: Icons.person_outline,
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
          child: Card(
            color: AppColors.surface,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: const BorderSide(color: AppColors.border),
            ),
            child: ListTile(
              leading: const Icon(
                Icons.storefront_outlined,
                color: AppColors.green,
              ),
              title: Text(
                l10n.merchantPanel,
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
              subtitle: Text(l10n.merchantPanelHint),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push(RoutePaths.merchant),
            ),
          ),
        ),
      ],
    );
  }
}
