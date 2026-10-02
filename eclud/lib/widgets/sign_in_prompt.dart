import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/theme/app_colors.dart';
import '../l10n/app_localizations.dart';
import '../routes/route_paths.dart';
import 'primary_button.dart';

/// Convite para entrar ou criar conta, nas áreas que exigem login.
class SignInPrompt extends StatelessWidget {
  const SignInPrompt({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
  });

  final IconData icon;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return SafeArea(
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(32),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 400),
            child: Column(
              children: [
                Icon(icon, size: 56, color: AppColors.green),
                const SizedBox(height: 16),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  message,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: AppColors.textMuted,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 24),
                PrimaryButton(
                  label: l10n.createAccount,
                  onPressed: () => context.push(RoutePaths.register),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () => context.push(RoutePaths.login),
                  child: Text(
                    l10n.signIn,
                    style: const TextStyle(
                      color: AppColors.green,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
