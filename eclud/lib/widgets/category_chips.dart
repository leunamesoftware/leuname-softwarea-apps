import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';
import '../data/models/partner_category.dart';
import '../l10n/app_localizations.dart';
import 'category_style.dart';

/// Linha rolável de filtros: "Todos" + uma opção por categoria.
class CategoryChips extends StatelessWidget {
  const CategoryChips({
    super.key,
    required this.selected,
    required this.onSelected,
    this.padding = const EdgeInsets.symmetric(horizontal: 20),
  });

  final PartnerCategory? selected;
  final ValueChanged<PartnerCategory?> onSelected;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final options = <(PartnerCategory?, String)>[
      (null, l10n.categoryAll),
      for (final c in PartnerCategory.values) (c, c.label(l10n)),
    ];

    return SizedBox(
      height: 40,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: padding,
        itemCount: options.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (context, i) {
          final (category, label) = options[i];
          final isSelected = category == selected;
          return _Chip(
            label: label,
            selected: isSelected,
            onTap: () => onSelected(category),
          );
        },
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      selected: selected,
      button: true,
      child: Material(
        color: selected ? AppColors.green : AppColors.surface,
        shape: StadiumBorder(
          side: BorderSide(
            color: selected ? AppColors.green : AppColors.border,
          ),
        ),
        child: InkWell(
          customBorder: const StadiumBorder(),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 18),
            child: Center(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 13.5,
                  fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                  color: selected ? AppColors.onGreen : AppColors.text,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
