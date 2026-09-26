import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';
import '../core/theme/app_text_styles.dart';

/// Placeholder para telas cujo conteúdo completo é construído em uma fase
/// posterior do projeto — mantém a navegação funcional sem antecipar
/// funcionalidades fora do escopo da fase atual.
class ComingSoonView extends StatelessWidget {
  const ComingSoonView({
    super.key,
    required this.icon,
    required this.title,
    required this.phase,
  });

  final IconData icon;
  final String title;
  final String phase;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 56, color: AppColors.primary),
            const SizedBox(height: 16),
            Text(title, style: AppTextStyles.h2, textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text(
              'Esta área será construída na $phase.',
              style: AppTextStyles.bodyRegular.copyWith(
                color: Colors.grey.shade600,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
