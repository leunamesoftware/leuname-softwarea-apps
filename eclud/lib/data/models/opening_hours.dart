/// Turno de funcionamento em minutos desde 00:00. Se [close] ≤ [open], o
/// turno termina no dia seguinte (ex.: 20:00–02:00).
class TimeRange {
  const TimeRange(this.open, this.close);

  final int open;
  final int close;

  bool get overnight => close <= open;

  static int parse(String hhmm) {
    final parts = hhmm.split(':');
    return int.parse(parts[0]) * 60 + int.parse(parts[1]);
  }

  static String format(int minutes) =>
      '${(minutes ~/ 60).toString().padLeft(2, '0')}:'
      '${(minutes % 60).toString().padLeft(2, '0')}';

  @override
  String toString() => '${format(open)}–${format(close)}';
}

/// Horário semanal: dia 1 (segunda) a 7 (domingo), até 2 turnos por dia.
class OpeningHours {
  const OpeningHours(this.days);

  final Map<int, List<TimeRange>> days;

  List<TimeRange> on(int weekday) => days[weekday] ?? const [];

  bool isOpenAt(DateTime time) {
    final minute = time.hour * 60 + time.minute;
    for (final r in on(time.weekday)) {
      if (r.overnight
          ? minute >= r.open
          : minute >= r.open && minute < r.close) {
        return true;
      }
    }
    // Turno da véspera que atravessa a meia-noite.
    final yesterday = time.weekday == 1 ? 7 : time.weekday - 1;
    return on(yesterday).any((r) => r.overnight && minute < r.close);
  }

  /// Próxima abertura ainda hoje (minutos), ou `null`.
  int? nextOpeningToday(DateTime time) {
    final minute = time.hour * 60 + time.minute;
    final later = on(time.weekday).where((r) => r.open > minute).toList();
    return later.isEmpty ? null : later.first.open;
  }

  factory OpeningHours.fromJson(Map<String, dynamic> json) => OpeningHours({
    for (final e in json.entries)
      int.parse(e.key): [
        for (final r in e.value as List<dynamic>)
          TimeRange(
            TimeRange.parse((r as List<dynamic>)[0] as String),
            TimeRange.parse(r[1] as String),
          ),
      ],
  });

  Map<String, dynamic> toJson() => {
    for (final e in days.entries)
      if (e.value.isNotEmpty)
        '${e.key}': [
          for (final r in e.value)
            [TimeRange.format(r.open), TimeRange.format(r.close)],
        ],
  };
}
