import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';
import '../core/theme/app_text_styles.dart';

/// Botão em formato de pílula com ícone à esquerda, usado nos CTAs de
/// autenticação (Google / e-mail) e em outras ações de destaque do app.
class PillButton extends StatelessWidget {
  const PillButton({
    super.key,
    required this.label,
    this.icon,
    this.trailing,
    required this.onPressed,
    this.filled = true,
  });

  final String label;
  final Widget? icon;
  final Widget? trailing;
  final VoidCallback? onPressed;
  final bool filled;

  @override
  Widget build(BuildContext context) {
    final textColor = filled ? Colors.white : AppColors.textDark;
    final child = Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (icon != null) ...[icon!, const SizedBox(width: 12)],
        Flexible(
          child: Text(
            label,
            textAlign: TextAlign.center,
            overflow: TextOverflow.ellipsis,
            style: AppTextStyles.titleSemiBold.copyWith(color: textColor),
          ),
        ),
        if (trailing != null) ...[const SizedBox(width: 10), trailing!],
      ],
    );

    return SizedBox(
      width: double.infinity,
      height: 56,
      child: filled
          ? DecoratedBox(
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.primary, Color(0xFFE0470D)],
                ),
                borderRadius: BorderRadius.circular(30),
              ),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  borderRadius: BorderRadius.circular(30),
                  onTap: onPressed,
                  child: Center(child: child),
                ),
              ),
            )
          : Material(
              color: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(30),
                side: BorderSide(color: Colors.grey.shade300),
              ),
              child: InkWell(
                borderRadius: BorderRadius.circular(30),
                onTap: onPressed,
                child: Center(child: child),
              ),
            ),
    );
  }
}
