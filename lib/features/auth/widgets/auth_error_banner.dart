import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';

/// Faixa de erro exibida nos formulários de autenticação.
class AuthErrorBanner extends StatelessWidget {
  const AuthErrorBanner({super.key, required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.danger.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        message,
        style: AppTextStyles.bodyRegular.copyWith(color: AppColors.danger),
      ),
    );
  }
}
