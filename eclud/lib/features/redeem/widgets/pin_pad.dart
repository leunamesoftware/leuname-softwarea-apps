import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';

/// Indicadores do PIN: um círculo por dígito, preenchido conforme digita.
class PinDots extends StatelessWidget {
  const PinDots({
    super.key,
    required this.length,
    required this.filled,
    required this.hasError,
  });

  final int length;
  final int filled;
  final bool hasError;

  @override
  Widget build(BuildContext context) {
    final color = hasError ? AppColors.danger : AppColors.green;
    return Semantics(
      label: '$filled / $length',
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: hasError ? color : AppColors.border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (var i = 0; i < length; i++)
              AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                margin: const EdgeInsets.symmetric(horizontal: 12),
                width: 16,
                height: 16,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: i < filled ? color : Colors.transparent,
                  border: Border.all(
                    color: i < filled ? color : AppColors.textMuted,
                    width: 2,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// Teclado numérico próprio: evita o teclado do sistema e fica igual em
/// todos os celulares.
class PinPad extends StatelessWidget {
  const PinPad({
    super.key,
    required this.enabled,
    required this.onDigit,
    required this.onDelete,
    required this.deleteLabel,
  });

  final bool enabled;
  final ValueChanged<String> onDigit;
  final VoidCallback onDelete;
  final String deleteLabel;

  @override
  Widget build(BuildContext context) {
    Widget digit(String d) => _Key(
      onTap: enabled ? () => onDigit(d) : null,
      child: Text(
        d,
        style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w600),
      ),
    );

    final rows = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
    ];

    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 320),
      child: Column(
        children: [
          for (final row in rows)
            Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [for (final d in row) digit(d)],
              ),
            ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const SizedBox(width: _Key.size),
              digit('0'),
              _Key(
                filled: false,
                semanticLabel: deleteLabel,
                onTap: enabled ? onDelete : null,
                child: const Icon(Icons.backspace_outlined),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Key extends StatelessWidget {
  const _Key({
    required this.child,
    required this.onTap,
    this.filled = true,
    this.semanticLabel,
  });

  static const double size = 76;

  final Widget child;
  final VoidCallback? onTap;
  final bool filled;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: semanticLabel,
      child: Material(
        color: filled ? AppColors.surface : Colors.transparent,
        shape: CircleBorder(
          side: BorderSide(
            color: filled ? AppColors.border : Colors.transparent,
          ),
        ),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onTap,
          child: SizedBox.square(
            dimension: size,
            child: Center(child: child),
          ),
        ),
      ),
    );
  }
}
