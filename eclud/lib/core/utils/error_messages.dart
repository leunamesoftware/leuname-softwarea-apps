import '../../data/api/api_client.dart';
import '../../l10n/app_localizations.dart';

/// Converte erros da API em mensagens para o usuário.
String errorMessage(AppLocalizations l10n, Object error) {
  if (error is! ApiException) return l10n.errorGeneric;
  if (error.isNetwork) return l10n.errorNetwork;
  return switch (error.code) {
    'email_taken' => l10n.errorEmailTaken,
    'invalid_credentials' => l10n.errorInvalidCredentials,
    'too_many_attempts' => l10n.tooManyAttempts(
      ((error.data['retryAfterSeconds'] as int? ?? 900) / 60).ceil(),
    ),
    'subscription_required' => l10n.subscriptionRequired,
    _ => l10n.errorGeneric,
  };
}
