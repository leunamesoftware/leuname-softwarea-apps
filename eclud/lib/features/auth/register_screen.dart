import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/config/app_config.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/error_messages.dart';
import '../../core/utils/external_links.dart';
import '../../l10n/app_localizations.dart';
import '../../routes/route_paths.dart';
import '../../widgets/primary_button.dart';
import 'auth_form.dart';
import 'session_providers.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _acceptedTerms = false;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context);
    final valid = _formKey.currentState!.validate();
    if (!_acceptedTerms) {
      setState(() => _error = l10n.mustAcceptTerms);
      return;
    }
    if (!valid) return;

    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ref
          .read(sessionProvider.notifier)
          .register(_name.text.trim(), _email.text.trim(), _password.text);
      // Conta nova sem destino definido segue para a assinatura.
      if (!mounted) return;
      final next = GoRouterState.of(context).uri.queryParameters['next'];
      context.go(isSafeNext(next) ? next! : RoutePaths.subscribe);
    } catch (e) {
      if (mounted) setState(() => _error = errorMessage(l10n, e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    void openLink(String url) =>
        ExternalLinks.open(context, url, errorMessage: l10n.linkError);

    return AuthScaffold(
      title: l10n.registerTitle,
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AuthField(
              controller: _name,
              label: l10n.nameLabel,
              keyboardType: TextInputType.name,
              autofillHints: const [AutofillHints.name],
              validator: (v) => AuthValidators.name(l10n, v),
            ),
            AuthField(
              controller: _email,
              label: l10n.emailLabel,
              keyboardType: TextInputType.emailAddress,
              autofillHints: const [AutofillHints.email],
              validator: (v) => AuthValidators.email(l10n, v),
            ),
            PasswordField(
              controller: _password,
              hint: l10n.passwordHint,
              autofillHints: const [AutofillHints.newPassword],
              validator: (v) => AuthValidators.password(l10n, v),
              onSubmitted: (_) => _submit(),
            ),
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
              value: _acceptedTerms,
              activeColor: AppColors.green,
              onChanged: (v) => setState(() {
                _acceptedTerms = v ?? false;
                if (_acceptedTerms) _error = null;
              }),
              title: Text(
                l10n.acceptTerms,
                style: const TextStyle(fontSize: 13.5),
              ),
            ),
            Wrap(
              spacing: 8,
              children: [
                TextButton(
                  onPressed: () => openLink(AppConfig.termsUrl),
                  child: Text(l10n.termsOfUse),
                ),
                TextButton(
                  onPressed: () => openLink(AppConfig.privacyUrl),
                  child: Text(l10n.privacyPolicy),
                ),
              ],
            ),
            const SizedBox(height: 12),
            AuthError(_error),
            _loading
                ? const Center(child: CircularProgressIndicator())
                : PrimaryButton(label: l10n.createAccount, onPressed: _submit),
            const SizedBox(height: 12),
            Wrap(
              alignment: WrapAlignment.center,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Text(
                  l10n.haveAccount,
                  style: const TextStyle(color: AppColors.textMuted),
                ),
                TextButton(
                  onPressed: () => context.pushReplacement(
                    withNext(context, RoutePaths.login),
                  ),
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
          ],
        ),
      ),
    );
  }
}
