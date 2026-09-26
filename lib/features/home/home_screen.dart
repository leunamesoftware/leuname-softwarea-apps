import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../auth/auth_providers.dart';

/// Home provisória da Fase 1: confirma que a navegação e o perfil do usuário
/// autenticado estão funcionando. O layout completo (categorias, busca,
/// destaques por região) é construído na Fase 4.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(currentUserProfileProvider).value;
    final firstName = (profile?.name.isNotEmpty ?? false)
        ? profile!.name.split(' ').first
        : '';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          firstName.isEmpty ? 'Olá!' : 'Olá, $firstName!',
          style: AppTextStyles.h2,
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'O que você está procurando?',
              style: AppTextStyles.bodyRegular,
            ),
            const SizedBox(height: 24),
            const _SetupChecklist(),
          ],
        ),
      ),
    );
  }
}

class _SetupChecklist extends StatelessWidget {
  const _SetupChecklist();

  @override
  Widget build(BuildContext context) {
    const items = [
      'Projeto criado e configurado',
      'Banco de dados inicial pronto',
      'Autenticação funcionando',
      'Navegação principal ativa',
    ];

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surfaceMuted,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Fase 1 — Fundação', style: AppTextStyles.titleSemiBold),
          const SizedBox(height: 12),
          for (final item in items)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                children: [
                  const Icon(
                    Icons.check_circle,
                    color: AppColors.success,
                    size: 18,
                  ),
                  const SizedBox(width: 8),
                  Expanded(child: Text(item, style: AppTextStyles.bodyRegular)),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
