import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../l10n/app_localizations.dart';
import '../../routes/route_paths.dart';
import '../../widgets/eclud_logo.dart';

/// Moldura comum das telas de cadastro e login (centralizada no PC).
class AuthScaffold extends StatelessWidget {
  const AuthScaffold({super.key, required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        leading: BackButton(
          onPressed: () => context.canPop()
              ? context.pop()
              : context.go(RoutePaths.onboarding),
        ),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: AutofillGroup(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Center(child: EcludLogoRow()),
                    const SizedBox(height: 24),
                    Text(
                      title,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 24),
                    child,
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Campo de texto padronizado das telas de conta.
class AuthField extends StatelessWidget {
  const AuthField({
    super.key,
    required this.controller,
    required this.label,
    this.hint,
    this.keyboardType,
    this.autofillHints,
    this.validator,
    this.textInputAction = TextInputAction.next,
    this.onSubmitted,
  });

  final TextEditingController controller;
  final String label;
  final String? hint;
  final TextInputType? keyboardType;
  final Iterable<String>? autofillHints;
  final String? Function(String?)? validator;
  final TextInputAction textInputAction;
  final ValueChanged<String>? onSubmitted;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: TextFormField(
        controller: controller,
        keyboardType: keyboardType,
        autofillHints: autofillHints,
        validator: validator,
        textInputAction: textInputAction,
        onFieldSubmitted: onSubmitted,
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 14,
            vertical: 16,
          ),
        ),
      ),
    );
  }
}

/// Campo de senha com botão de mostrar/ocultar.
class PasswordField extends StatefulWidget {
  const PasswordField({
    super.key,
    required this.controller,
    required this.autofillHints,
    this.validator,
    this.hint,
    this.onSubmitted,
  });

  final TextEditingController controller;
  final Iterable<String> autofillHints;
  final String? Function(String?)? validator;
  final String? hint;
  final ValueChanged<String>? onSubmitted;

  @override
  State<PasswordField> createState() => _PasswordFieldState();
}

class _PasswordFieldState extends State<PasswordField> {
  bool _visible = false;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: TextFormField(
        controller: widget.controller,
        obscureText: !_visible,
        autofillHints: widget.autofillHints,
        validator: widget.validator,
        textInputAction: TextInputAction.done,
        onFieldSubmitted: widget.onSubmitted,
        decoration: InputDecoration(
          labelText: l10n.passwordLabel,
          hintText: widget.hint,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 14,
            vertical: 16,
          ),
          suffixIcon: IconButton(
            tooltip: _visible ? l10n.hidePassword : l10n.showPassword,
            icon: Icon(_visible ? Icons.visibility_off : Icons.visibility),
            color: AppColors.textMuted,
            onPressed: () => setState(() => _visible = !_visible),
          ),
        ),
      ),
    );
  }
}

/// Mensagem de erro em destaque acima do botão.
class AuthError extends StatelessWidget {
  const AuthError(this.message, {super.key});

  final String? message;

  @override
  Widget build(BuildContext context) {
    final text = message;
    if (text == null) return const SizedBox.shrink();
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.danger.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.danger.withValues(alpha: 0.5)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: AppColors.danger),
          const SizedBox(width: 10),
          Expanded(child: Text(text, semanticsLabel: text)),
        ],
      ),
    );
  }
}

abstract final class AuthValidators {
  static final _email = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

  static String? email(AppLocalizations l10n, String? v) =>
      _email.hasMatch(v?.trim() ?? '') ? null : l10n.emailInvalid;

  static String? name(AppLocalizations l10n, String? v) =>
      (v?.trim().length ?? 0) >= 2 ? null : l10n.nameInvalid;

  static String? password(AppLocalizations l10n, String? v) =>
      (v?.length ?? 0) >= 8 ? null : l10n.passwordTooShort;
}

/// Destino depois de entrar: o `next` da URL (só caminhos internos) ou o início.
String nextAfterAuth(BuildContext context) {
  final next = GoRouterState.of(context).uri.queryParameters['next'];
  return isSafeNext(next) ? next! : RoutePaths.home;
}

/// Mantém o `next` ao alternar entre cadastro e login.
String withNext(BuildContext context, String path) {
  final next = GoRouterState.of(context).uri.queryParameters['next'];
  return isSafeNext(next)
      ? Uri(path: path, queryParameters: {'next': next}).toString()
      : path;
}

bool isSafeNext(String? next) =>
    next != null && next.startsWith('/') && !next.startsWith('//');
