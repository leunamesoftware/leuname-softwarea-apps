import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';
import '../data/models/opening_hours.dart';
import '../l10n/app_localizations.dart';

/// "Abierto" / "Cerrado · Abre a las 20:00", calculado com a hora do aparelho.
class OpenStatus extends StatelessWidget {
  const OpenStatus({
    super.key,
    required this.hours,
    this.now,
    this.fontSize = 12.5,
  });

  final OpeningHours hours;
  final DateTime? now;
  final double fontSize;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final time = now ?? DateTime.now();
    final open = hours.isOpenAt(time);
    final next = open ? null : hours.nextOpeningToday(time);
    final label = open
        ? l10n.openNow
        : next == null
        ? l10n.closedNow
        : '${l10n.closedNow} · ${l10n.opensAt(TimeRange.format(next))}';
    return Text(
      label,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: TextStyle(
        fontSize: fontSize,
        fontWeight: FontWeight.w600,
        color: open ? AppColors.green : AppColors.textMuted,
      ),
    );
  }
}
