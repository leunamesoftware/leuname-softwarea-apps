import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app_colors.dart';
import 'app_text_styles.dart';

/// Tema global do LeuPlace, construído a partir da identidade visual oficial.
abstract final class AppTheme {
  static ThemeData get light {
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.primary,
        primary: AppColors.primary,
        secondary: AppColors.secondary,
        surface: AppColors.background,
        error: AppColors.danger,
      ),
      scaffoldBackgroundColor: AppColors.background,
      fontFamily: GoogleFonts.poppins().fontFamily,
    );

    return base.copyWith(
      textTheme: base.textTheme.apply(
        fontFamily: GoogleFonts.poppins().fontFamily,
        bodyColor: AppColors.textDark,
        displayColor: AppColors.textDark,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textDark,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: AppTextStyles.h2,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: AppColors.background,
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          textStyle: AppTextStyles.buttonLabel,
          elevation: 0,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.primary,
          minimumSize: const Size.fromHeight(52),
          side: const BorderSide(color: AppColors.primary, width: 1.5),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          textStyle: AppTextStyles.buttonLabel.copyWith(
            color: AppColors.primary,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.secondary,
          textStyle: AppTextStyles.titleSemiBold,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surfaceMuted,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 14,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
        hintStyle: AppTextStyles.bodyRegular.copyWith(
          color: Colors.grey.shade500,
        ),
      ),
      cardTheme: CardThemeData(
        color: AppColors.background,
        surfaceTintColor: Colors.transparent,
        elevation: 1,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: AppColors.background,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: Colors.grey.shade500,
        type: BottomNavigationBarType.fixed,
        showUnselectedLabels: true,
        selectedLabelStyle: AppTextStyles.caption.copyWith(
          fontWeight: FontWeight.w600,
        ),
        unselectedLabelStyle: AppTextStyles.caption,
      ),
    );
  }
}
