import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app_colors.dart';

/// Estilos de texto padronizados com a tipografia oficial (Poppins).
abstract final class AppTextStyles {
  static TextStyle _base(double size, FontWeight weight, {Color? color}) {
    return GoogleFonts.poppins(
      fontSize: size,
      fontWeight: weight,
      color: color ?? AppColors.textDark,
    );
  }

  static TextStyle get displayBold => _base(32, FontWeight.w700);
  static TextStyle get h1 => _base(24, FontWeight.w700);
  static TextStyle get h2 => _base(20, FontWeight.w600);
  static TextStyle get titleSemiBold => _base(16, FontWeight.w600);
  static TextStyle get bodyRegular => _base(14, FontWeight.w400);
  static TextStyle get bodyLight => _base(14, FontWeight.w300);
  static TextStyle get caption =>
      _base(12, FontWeight.w400, color: Colors.grey.shade600);
  static TextStyle get buttonLabel =>
      _base(16, FontWeight.w600, color: AppColors.background);
}
