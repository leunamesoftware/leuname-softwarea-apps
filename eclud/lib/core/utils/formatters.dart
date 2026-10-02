import 'package:intl/intl.dart';

/// Formatos no padrão europeu: "1,99 €" e "0,8 km".
abstract final class Formatters {
  static String price(double value, String locale) =>
      NumberFormat.currency(locale: locale, symbol: '€').format(value);

  static String distance(double meters, String locale) {
    if (meters < 1000) return '${meters.round()} m';
    return '${NumberFormat('0.0', locale).format(meters / 1000)} km';
  }

  static String percent(int value) => '$value%';
}
