import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/theme/app_colors.dart';
import '../core/theme/app_theme.dart';
import '../l10n/app_localizations.dart';
import 'content_width.dart';
import 'eclud_logo.dart';

/// Navegação principal com 4 abas, mantendo o estado de cada uma.
/// No celular, barra inferior; no PC (tela larga), menu lateral.
class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  static const wideBreakpoint = 900.0;
  static const _mapTab = 1;

  void _onSelect(int i) => navigationShell.goBranch(
    i,
    initialLocation: i == navigationShell.currentIndex,
  );

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tabs = [
      (Icons.home_outlined, Icons.home_rounded, l10n.navHome),
      (Icons.place_outlined, Icons.place, l10n.navMap),
      (Icons.savings_outlined, Icons.savings, l10n.navSavings),
      (Icons.person_outline, Icons.person, l10n.navProfile),
    ];

    final isWide = MediaQuery.sizeOf(context).width >= wideBreakpoint;
    if (isWide) {
      final index = navigationShell.currentIndex;
      return Scaffold(
        body: Row(
          children: [
            NavigationRail(
              backgroundColor: AppColors.background,
              extended: true,
              minExtendedWidth: 220,
              selectedIndex: index,
              onDestinationSelected: _onSelect,
              indicatorColor: AppColors.surfaceHigh,
              selectedLabelTextStyle: const TextStyle(
                fontFamily: AppTheme.fontFamily,
                color: AppColors.green,
                fontWeight: FontWeight.w700,
              ),
              unselectedLabelTextStyle: const TextStyle(
                fontFamily: AppTheme.fontFamily,
                color: AppColors.textMuted,
              ),
              leading: const Padding(
                padding: EdgeInsets.fromLTRB(8, 20, 8, 28),
                child: EcludLogoRow(),
              ),
              destinations: [
                for (final (icon, activeIcon, label) in tabs)
                  NavigationRailDestination(
                    icon: Icon(icon, color: AppColors.textMuted),
                    selectedIcon: Icon(activeIcon, color: AppColors.green),
                    label: Text(label),
                  ),
              ],
            ),
            const VerticalDivider(width: 1, color: AppColors.border),
            Expanded(
              // O mapa usa a tela toda; as demais abas ficam centralizadas.
              child: index == _mapTab
                  ? navigationShell
                  : ContentWidth(child: navigationShell),
            ),
          ],
        ),
      );
    }

    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: DecoratedBox(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: AppColors.border)),
        ),
        child: NavigationBarTheme(
          data: NavigationBarThemeData(
            backgroundColor: AppColors.background,
            indicatorColor: Colors.transparent,
            labelTextStyle: WidgetStateProperty.resolveWith(
              (states) => TextStyle(
                fontSize: 12,
                fontWeight: states.contains(WidgetState.selected)
                    ? FontWeight.w700
                    : FontWeight.w500,
                color: states.contains(WidgetState.selected)
                    ? AppColors.green
                    : AppColors.textMuted,
              ),
            ),
          ),
          child: NavigationBar(
            height: 68,
            selectedIndex: navigationShell.currentIndex,
            onDestinationSelected: _onSelect,
            destinations: [
              for (final (icon, activeIcon, label) in tabs)
                NavigationDestination(
                  icon: Icon(icon, color: AppColors.textMuted),
                  selectedIcon: Icon(activeIcon, color: AppColors.green),
                  label: label,
                ),
            ],
          ),
        ),
      ),
    );
  }
}
