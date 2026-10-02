import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_colors.dart';
import '../../../data/models/opening_hours.dart';
import '../../../l10n/app_localizations.dart';

/// Edita o horário semanal: cada dia aberto/fechado e até 2 turnos.
class OpeningHoursEditor extends StatelessWidget {
  const OpeningHoursEditor({
    super.key,
    required this.value,
    required this.onChanged,
  });

  final Map<int, List<TimeRange>> value;
  final ValueChanged<Map<int, List<TimeRange>>> onChanged;

  static const _defaultShift = TimeRange(9 * 60, 14 * 60);
  static const _secondShift = TimeRange(17 * 60, 21 * 60);

  void _set(int day, List<TimeRange> ranges) =>
      onChanged({...value, day: ranges});

  Future<void> _pick(
    BuildContext context,
    int day,
    int index, {
    required bool open,
  }) async {
    final range = value[day]![index];
    final current = open ? range.open : range.close;
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: current ~/ 60, minute: current % 60),
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context).copyWith(alwaysUse24HourFormat: true),
        child: child!,
      ),
    );
    if (picked == null) return;
    final minutes = picked.hour * 60 + picked.minute;
    final updated = [...value[day]!];
    updated[index] = open
        ? TimeRange(minutes, range.close)
        : TimeRange(range.open, minutes);
    _set(day, updated);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context).toLanguageTag();
    String dayName(int weekday) => toBeginningOfSentenceCase(
      DateFormat.E(locale).format(DateTime(2025, 10, 5 + weekday)),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          l10n.openingHoursLabel,
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 6),
        for (var day = 1; day <= 7; day++)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 2),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                SizedBox(width: 44, child: Text(dayName(day))),
                Switch(
                  value: (value[day] ?? const []).isNotEmpty,
                  activeThumbColor: AppColors.green,
                  onChanged: (open) =>
                      _set(day, open ? [_defaultShift] : const []),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: (value[day] ?? const []).isEmpty
                      ? Text(
                          l10n.closedAllDay,
                          style: const TextStyle(color: AppColors.textMuted),
                        )
                      : Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            for (var i = 0; i < value[day]!.length; i++)
                              _ShiftChip(
                                range: value[day]![i],
                                onOpen: () =>
                                    _pick(context, day, i, open: true),
                                onClose: () =>
                                    _pick(context, day, i, open: false),
                                onRemove: value[day]!.length > 1
                                    ? () => _set(
                                        day,
                                        [...value[day]!]..removeAt(i),
                                      )
                                    : null,
                                removeLabel: l10n.removeShift,
                              ),
                            if (value[day]!.length < 2)
                              IconButton(
                                tooltip: l10n.addShift,
                                visualDensity: VisualDensity.compact,
                                icon: const Icon(
                                  Icons.add_circle_outline,
                                  color: AppColors.green,
                                ),
                                onPressed: () =>
                                    _set(day, [...value[day]!, _secondShift]),
                              ),
                          ],
                        ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class _ShiftChip extends StatelessWidget {
  const _ShiftChip({
    required this.range,
    required this.onOpen,
    required this.onClose,
    required this.onRemove,
    required this.removeLabel,
  });

  final TimeRange range;
  final VoidCallback onOpen;
  final VoidCallback onClose;
  final VoidCallback? onRemove;
  final String removeLabel;

  @override
  Widget build(BuildContext context) {
    Widget time(int minutes, VoidCallback onTap) => InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(6),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
        child: Text(
          TimeRange.format(minutes),
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
      ),
    );

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6),
      decoration: BoxDecoration(
        color: AppColors.surfaceHigh,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          time(range.open, onOpen),
          const Text('–'),
          time(range.close, onClose),
          if (onRemove != null)
            IconButton(
              tooltip: removeLabel,
              visualDensity: VisualDensity.compact,
              iconSize: 16,
              onPressed: onRemove,
              icon: const Icon(Icons.close, color: AppColors.textMuted),
            ),
        ],
      ),
    );
  }
}
