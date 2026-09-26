import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';
import '../core/theme/app_text_styles.dart';

/// Marca do LeuPlace: ícone (carrinho) + wordmark "LeuPlace" e, opcionalmente,
/// a tagline oficial. Reutilizado na splash screen e nas telas de autenticação.
class AppLogo extends StatelessWidget {
  const AppLogo({
    super.key,
    this.markSize = 140,
    this.wordmarkFontSize = 40,
    this.showTagline = true,
    this.wordmarkColor,
  });

  final double markSize;
  final double wordmarkFontSize;
  final bool showTagline;
  final Color? wordmarkColor;

  @override
  Widget build(BuildContext context) {
    final leuColor = wordmarkColor ?? AppColors.textDark;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Image.asset(
          'assets/images/leuplace_mark.png',
          width: markSize,
          height: markSize,
        ),
        const SizedBox(height: 8),
        RichText(
          text: TextSpan(
            style: AppTextStyles.displayBold.copyWith(
              fontSize: wordmarkFontSize,
              height: 1,
            ),
            children: [
              TextSpan(
                text: 'Leu',
                style: TextStyle(color: leuColor),
              ),
              const TextSpan(
                text: 'Place',
                style: TextStyle(color: AppColors.primary),
              ),
            ],
          ),
        ),
        if (showTagline) ...[
          const SizedBox(height: 6),
          Text(
            'Compra • Venda • Encontre',
            style: AppTextStyles.bodyRegular.copyWith(color: leuColor),
          ),
        ],
      ],
    );
  }
}
