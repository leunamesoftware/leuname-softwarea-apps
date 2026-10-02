import 'package:eclud/data/models/opening_hours.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  // 2026-10-05 é segunda-feira (weekday 1).
  DateTime at(int day, int h, int m) => DateTime(2026, 10, 4 + day, h, m);

  final hours = OpeningHours.fromJson({
    '1': [
      ['13:00', '16:00'],
      ['20:00', '23:30'],
    ],
    '5': [
      ['20:00', '02:00'],
    ],
  });

  test('aberto dentro dos turnos e fechado no descanso', () {
    expect(hours.isOpenAt(at(1, 14, 0)), isTrue);
    expect(hours.isOpenAt(at(1, 17, 0)), isFalse);
    expect(hours.isOpenAt(at(1, 16, 0)), isFalse);
    expect(hours.isOpenAt(at(2, 14, 0)), isFalse);
  });

  test('turno que passa da meia-noite vale na madrugada seguinte', () {
    expect(hours.isOpenAt(at(5, 23, 0)), isTrue);
    expect(hours.isOpenAt(at(6, 1, 30)), isTrue);
    expect(hours.isOpenAt(at(6, 2, 30)), isFalse);
  });

  test('próxima abertura do dia', () {
    expect(hours.nextOpeningToday(at(1, 17, 0)), 20 * 60);
    expect(hours.nextOpeningToday(at(1, 23, 50)), isNull);
  });

  test('ida e volta em JSON', () {
    expect(OpeningHours.fromJson(hours.toJson()).toJson(), hours.toJson());
  });
}
