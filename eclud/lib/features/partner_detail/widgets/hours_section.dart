import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_colors.dart';
import '../../../data/models/opening_hours.dart';
import '../../../l10n/app_localizations.dart';
import '../../../widgets/open_status.dart';

/// Horário: situação de agora e, ao tocar, a semana inteira.
class HoursSection extends StatelessWidget {
  const HoursSection({super.key, required this.hours});

  final OpeningHours hours;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context).toLanguageTag();
    final today = DateTime.now().weekday;
    // 6/10/2025 foi uma segunda-feira: base para o nome dos dias.
    String dayName(int weekday) => toBeginningOfSentenceCase(
      DateFormat.EEEE(locale).format(DateTime(2025, 10, 5 + weekday)),
    );

    return Theme(
      data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
      child: ExpansionTile(
        tilePadding: EdgeInsets.zero,
        childrenPadding: const EdgeInsets.only(left: 54, bottom: 8),
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: AppColors.surfaceHigh,
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Icon(Icons.schedule, color: AppColors.green, size: 22),
        ),
        title: Text(
          l10n.hours,
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
        subtitle: OpenStatus(hours: hours, fontSize: 14),
        iconColor: AppColors.green,
        collapsedIconColor: AppColors.textMuted,
        children: [
          for (var day = 1; day <= 7; day++)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 3),
              child: Row(
                children: [
                  SizedBox(
                    width: 110,
                    child: Text(
                      dayName(day),
                      style: TextStyle(
                        fontWeight: day == today
                            ? FontWeight.w700
                            : FontWeight.w400,
                      ),
                    ),
                  ),
                  Expanded(
                    child: Text(
                      hours.on(day).isEmpty
                          ? l10n.closedAllDay
                          : hours.on(day).join('  ·  '),
                      style: const TextStyle(color: AppColors.textMuted),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
