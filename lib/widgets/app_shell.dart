import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';
import '../core/theme/app_text_styles.dart';

/// Estrutura de navegação principal: 5 abas com "Anunciar" em destaque no
/// centro, conforme o padrão visual definido para o LeuPlace.
class AppShell extends StatelessWidget {
  const AppShell({
    super.key,
    required this.currentIndex,
    required this.onTap,
    required this.child,
  });

  final int currentIndex;
  final ValueChanged<int> onTap;
  final Widget child;

  static const _tabs = [
    (icon: Icons.home_outlined, activeIcon: Icons.home, label: 'Início'),
    (icon: Icons.search_outlined, activeIcon: Icons.search, label: 'Buscar'),
    null, // espaço reservado para o botão central "Anunciar"
    (
      icon: Icons.chat_bubble_outline,
      activeIcon: Icons.chat_bubble,
      label: 'Chat',
    ),
    (icon: Icons.person_outline, activeIcon: Icons.person, label: 'Perfil'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: BottomAppBar(
        shape: const CircularNotchedRectangle(),
        notchMargin: 8,
        padding: EdgeInsets.zero,
        child: SizedBox(
          height: 64,
          child: Row(
            children: List.generate(_tabs.length, (index) {
              final tab = _tabs[index];
              if (tab == null) return const Expanded(child: SizedBox());

              final isActive = index == currentIndex;
              return Expanded(
                child: InkWell(
                  onTap: () => onTap(index),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        isActive ? tab.activeIcon : tab.icon,
                        color: isActive
                            ? AppColors.primary
                            : Colors.grey.shade500,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        tab.label,
                        style: AppTextStyles.caption.copyWith(
                          color: isActive
                              ? AppColors.primary
                              : Colors.grey.shade500,
                          fontWeight: isActive
                              ? FontWeight.w600
                              : FontWeight.w400,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
          ),
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      floatingActionButton: FloatingActionButton(
        onPressed: () => onTap(2),
        backgroundColor: AppColors.primary,
        elevation: 2,
        child: const Icon(Icons.add, color: Colors.white, size: 30),
      ),
    );
  }
}
