import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/theme/app_colors.dart';
import '../core/theme/app_text_styles.dart';
import '../features/location/location_providers.dart';
import 'app_logo.dart';

/// Cabeçalho padrão usado na Home, Categorias e Buscar: logo compacta,
/// localização atual e ícone de notificações.
class AppHeader extends ConsumerWidget implements PreferredSizeWidget {
  const AppHeader({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final region = ref.watch(currentRegionLabelProvider);
    final city = ref.watch(currentLocationLabelProvider);

    return SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
        child: Row(
          children: [
            const AppLogo(
              markSize: 40,
              wordmarkFontSize: 18,
              showTagline: false,
            ),
            const Spacer(),
            InkWell(
              onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Localização — em breve.')),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.location_on,
                    color: AppColors.primary,
                    size: 20,
                  ),
                  const SizedBox(width: 4),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        region,
                        style: AppTextStyles.bodyRegular.copyWith(height: 1.1),
                      ),
                      Text(
                        city,
                        style: AppTextStyles.caption.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  const Icon(
                    Icons.keyboard_arrow_down,
                    size: 18,
                    color: Colors.grey,
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            const Icon(Icons.notifications_none, color: AppColors.textDark),
          ],
        ),
      ),
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(64);
}
