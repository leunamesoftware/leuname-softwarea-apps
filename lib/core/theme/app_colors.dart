import 'package:flutter/material.dart';

/// Paleta oficial da marca LeuPlace.
abstract final class AppColors {
  static const Color primary = Color(
    0xFFFF6B00,
  ); // Laranja principal — ação, compra e venda
  static const Color secondary = Color(
    0xFF6C2BD9,
  ); // Roxo de apoio — diferenciação e personalidade
  static const Color background = Color(
    0xFFFFFFFF,
  ); // Branco — limpeza e leveza
  static const Color textDark = Color(
    0xFF202124,
  ); // Grafite — textos e elementos
  static const Color surfaceMuted = Color(
    0xFFF4F4F5,
  ); // Cinza claro — fundos e cards

  static const Color success = Color(0xFF2FA84F);
  static const Color warning = Color(0xFFF2B705);
  static const Color danger = Color(0xFFE0332F);

  static const List<Color> splashGradient = [primary, Color(0xFFE0470D)];
}
