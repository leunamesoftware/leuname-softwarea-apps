import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';

/// Símbolo da marca (€ no C verde com a etiqueta de desconto).
class EcludMark extends StatelessWidget {
  const EcludMark({super.key, this.size = 40});

  final double size;

  @override
  Widget build(BuildContext context) => Image.asset(
    'assets/images/eclud_mark.png',
    width: size,
    height: size,
    filterQuality: FilterQuality.medium,
  );
}

/// Nome "Eclud" com o E em dourado.
class EcludWordmark extends StatelessWidget {
  const EcludWordmark({super.key, this.fontSize = 24});

  final double fontSize;

  @override
  Widget build(BuildContext context) {
    final style = TextStyle(
      fontSize: fontSize,
      fontWeight: FontWeight.w800,
      letterSpacing: -fontSize * 0.02,
      height: 1,
      color: AppColors.text,
    );
    return Text.rich(
      TextSpan(
        style: style,
        children: const [
          TextSpan(
            text: 'E',
            style: TextStyle(color: AppColors.gold),
          ),
          TextSpan(text: 'clud'),
        ],
      ),
      semanticsLabel: 'Eclud',
    );
  }
}

/// Símbolo + nome em linha, usado no topo das telas internas.
class EcludLogoRow extends StatelessWidget {
  const EcludLogoRow({super.key});

  @override
  Widget build(BuildContext context) => const Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      EcludMark(size: 36),
      SizedBox(width: 8),
      EcludWordmark(fontSize: 24),
    ],
  );
}
