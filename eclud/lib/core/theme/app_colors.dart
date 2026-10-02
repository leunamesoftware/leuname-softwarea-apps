import 'package:flutter/material.dart';

/// Paleta oficial da marca Eclud (verde e dourado sobre fundo escuro).
abstract final class AppColors {
  static const Color background = Color(0xFF06100C);
  static const Color surface = Color(0xFF0D1C16);
  static const Color surfaceHigh = Color(0xFF12291F);
  static const Color border = Color(0x331FD07F);
  static const Color borderStrong = Color(0x881FD07F);

  static const Color green = Color(0xFF1FD07F);
  static const Color greenDark = Color(0xFF0E9F5E);
  static const Color gold = Color(0xFFF6BE3B);

  static const Color text = Color(0xFFF3F6F5);
  static const Color textMuted = Color(0xFFA9B5B0);
  static const Color onGreen = Color(0xFF04150D);

  static const Color danger = Color(0xFFFF6B6B);

  static const List<Color> greenGradient = [green, greenDark];
}
