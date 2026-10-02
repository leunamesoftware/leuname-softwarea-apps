import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/config/app_config.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/error_messages.dart';
import '../../core/utils/external_links.dart';
import '../../data/models/app_user.dart';
import '../../l10n/app_localizations.dart';
import '../../routes/route_paths.dart';
import '../../widgets/sign_in_prompt.dart';
import '../auth/session_providers.dart';

/// Perfil: dados da conta, assinatura, painel do lojista e privacidade.
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final user = ref.watch(currentUserProvider);
    if (user == null) {
      return SignInPrompt(
        icon: Icons.person_outline,
        title: l10n.navProfile,
        message: l10n.signInToSeeProfile,
      );
    }

    void openLink(String url) =>
        ExternalLinks.open(context, url, errorMessage: l10n.linkError);

    return SafeArea(
      bottom: false,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        children: [
          Center(
            child: Text(
              l10n.navProfile,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
          ),
          const SizedBox(height: 20),
          _AccountCard(user: user),
          const SizedBox(height: 16),
          if (user.isMerchant)
            _Tile(
              icon: Icons.storefront_outlined,
              title: l10n.merchantPanel,
              subtitle: l10n.merchantPanelHint,
              onTap: () => context.push(RoutePaths.merchant),
            ),
          _Tile(
            icon: Icons.description_outlined,
            title: l10n.termsOfUse,
            onTap: () => openLink(AppConfig.termsUrl),
          ),
          _Tile(
            icon: Icons.privacy_tip_outlined,
            title: l10n.privacyPolicy,
            onTap: () => openLink(AppConfig.privacyUrl),
          ),
          _Tile(
            icon: Icons.logout,
            title: l10n.logout,
            onTap: () => ref.read(sessionProvider.notifier).logout(),
          ),
          _Tile(
            icon: Icons.delete_outline,
            title: l10n.deleteAccount,
            danger: true,
            onTap: () => _confirmDelete(context, ref),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmDelete(BuildContext context, WidgetRef ref) async {
    final l10n = AppLocalizations.of(context);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: Text(l10n.deleteAccountTitle),
        content: Text(l10n.deleteAccountBody),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: Text(l10n.cancel),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: Text(l10n.confirmDelete),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref.read(sessionProvider.notifier).deleteAccount();
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(errorMessage(l10n, e))));
    }
  }
}

class _AccountCard extends StatelessWidget {
  const _AccountCard({required this.user});

  final AppUser user;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context).toLanguageTag();
    final end = user.subscriptionEnd;
    final active = user.subscriptionActive && end != null;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 26,
            backgroundColor: AppColors.surfaceHigh,
            child: Text(
              user.firstName.isEmpty ? '?' : user.firstName[0].toUpperCase(),
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: AppColors.gold,
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  user.name,
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  user.email,
                  style: const TextStyle(color: AppColors.textMuted),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Icon(
                      active ? Icons.verified : Icons.info_outline,
                      size: 16,
                      color: active ? AppColors.green : AppColors.gold,
                    ),
                    const SizedBox(width: 6),
                    Flexible(
                      child: Text(
                        active
                            ? l10n.subscriptionActiveUntil(
                                DateFormat.yMMMd(locale).format(end.toLocal()),
                              )
                            : l10n.subscriptionInactive,
                        style: const TextStyle(fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Tile extends StatelessWidget {
  const _Tile({
    required this.icon,
    required this.title,
    required this.onTap,
    this.subtitle,
    this.danger = false,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback onTap;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    final color = danger ? AppColors.danger : AppColors.text;
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 4),
      leading: Icon(icon, color: danger ? AppColors.danger : AppColors.green),
      title: Text(
        title,
        style: TextStyle(color: color, fontWeight: FontWeight.w600),
      ),
      subtitle: subtitle == null ? null : Text(subtitle!),
      trailing: const Icon(Icons.chevron_right, color: AppColors.textMuted),
      onTap: onTap,
    );
  }
}
