import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/theme/app_colors.dart';
import '../l10n/app_localizations.dart';

/// Navegação principal com 4 abas, mantendo o estado de cada uma.
class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tabs = [
      (Icons.home_outlined, Icons.home_rounded, l10n.navHome),
      (Icons.place_outlined, Icons.place, l10n.navMap),
      (Icons.savings_outlined, Icons.savings, l10n.navSavings),
      (Icons.person_outline, Icons.person, l10n.navProfile),
    ];

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
            onDestinationSelected: (i) => navigationShell.goBranch(
              i,
              initialLocation: i == navigationShell.currentIndex,
            ),
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
