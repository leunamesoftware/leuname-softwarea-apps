import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/utils/error_messages.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/primary_button.dart';
import 'auth_form.dart';
import 'session_providers.dart';

/// Recuperar senha em 2 passos: e-mail → código de 6 dígitos + nova senha.
class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() => _ForgotState();
}

class _ForgotState extends ConsumerState<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _code = TextEditingController();
  final _password = TextEditingController();
  bool _codeSent = false;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _code.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _run(Future<void> Function() action) async {
    if (!_formKey.currentState!.validate()) return;
    final l10n = AppLocalizations.of(context);
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await action();
    } catch (e) {
      if (mounted) setState(() => _error = errorMessage(l10n, e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _sendCode() => _run(() async {
    await ref
        .read(authRepositoryProvider)
        .requestPasswordReset(_email.text.trim());
    if (mounted) setState(() => _codeSent = true);
  });

  Future<void> _reset() => _run(() async {
    await ref
        .read(sessionProvider.notifier)
        .resetPassword(_email.text.trim(), _code.text, _password.text);
    if (mounted) context.go(nextAfterAuth(context));
  });

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return AuthScaffold(
      title: l10n.forgotTitle,
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              _codeSent ? l10n.codeSent(_email.text.trim()) : l10n.forgotIntro,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.textMuted, height: 1.4),
            ),
            const SizedBox(height: 20),
            AuthField(
              controller: _email,
              label: l10n.emailLabel,
              keyboardType: TextInputType.emailAddress,
              autofillHints: const [AutofillHints.email],
              validator: (v) => AuthValidators.email(l10n, v),
            ),
            if (_codeSent) ...[
              Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: TextFormField(
                  controller: _code,
                  keyboardType: TextInputType.number,
                  autofillHints: const [AutofillHints.oneTimeCode],
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(6),
                  ],
                  decoration: InputDecoration(
                    labelText: l10n.codeLabel,
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 16,
                    ),
                  ),
                  validator: (v) =>
                      v?.length == 6 ? null : l10n.codeInvalidFormat,
                ),
              ),
              PasswordField(
                controller: _password,
                hint: l10n.passwordHint,
                autofillHints: const [AutofillHints.newPassword],
                validator: (v) => AuthValidators.password(l10n, v),
                onSubmitted: (_) => _reset(),
              ),
            ],
            AuthError(_error),
            _loading
                ? const Center(child: CircularProgressIndicator())
                : PrimaryButton(
                    label: _codeSent ? l10n.savePassword : l10n.sendCode,
                    onPressed: _codeSent ? _reset : _sendCode,
                  ),
            if (_codeSent)
              TextButton(
                onPressed: _loading ? null : _sendCode,
                child: Text(l10n.resendCode),
              ),
          ],
        ),
      ),
    );
  }
}
