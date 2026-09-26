import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../auth/auth_providers.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(currentUserProfileProvider).value;

    return Scaffold(
      appBar: AppBar(title: const Text('Perfil')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          CircleAvatar(
            radius: 36,
            backgroundColor: AppColors.surfaceMuted,
            backgroundImage: profile?.photoUrl != null
                ? NetworkImage(profile!.photoUrl!)
                : null,
            child: profile?.photoUrl == null
                ? const Icon(Icons.person, size: 36, color: AppColors.primary)
                : null,
          ),
          const SizedBox(height: 12),
          Text(
            profile?.name.isNotEmpty ?? false ? profile!.name : 'Usuário',
            style: AppTextStyles.h2,
          ),
          Text(
            profile?.email ?? '',
            style: AppTextStyles.bodyRegular.copyWith(
              color: Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 24),
          const _ProfileMenuItem(
            icon: Icons.badge_outlined,
            label: 'Meus dados',
          ),
          const _ProfileMenuItem(
            icon: Icons.location_on_outlined,
            label: 'Minha localização',
          ),
          const _ProfileMenuItem(
            icon: Icons.inventory_2_outlined,
            label: 'Meus anúncios',
          ),
          const _ProfileMenuItem(
            icon: Icons.favorite_border,
            label: 'Favoritos',
          ),
          const _ProfileMenuItem(
            icon: Icons.settings_outlined,
            label: 'Configurações',
          ),
          const SizedBox(height: 24),
          OutlinedButton.icon(
            onPressed: () => ref.read(authRepositoryProvider).signOut(),
            icon: const Icon(Icons.logout, color: AppColors.danger),
            label: const Text(
              'Sair',
              style: TextStyle(color: AppColors.danger),
            ),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: AppColors.danger),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileMenuItem extends StatelessWidget {
  const _ProfileMenuItem({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(icon, color: AppColors.textDark),
      title: Text(label, style: AppTextStyles.bodyRegular),
      trailing: const Icon(Icons.chevron_right, color: Colors.grey),
      onTap: () =>
          ScaffoldMessenger.of(context)
              .showSnackBar(SnackBar(content: Text('$label — em breve.'))),
    );
  }
}
