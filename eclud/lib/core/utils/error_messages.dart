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
    'owner_not_found' => l10n.errorOwnerNotFound,
    'invalid_code' => l10n.errorInvalidCode,
    'review_not_allowed' => l10n.errorReviewNotAllowed,
    'purchase_in_use' => l10n.errorPurchaseInUse,
    'billing_not_configured' || 'invalid_purchase' => l10n.errorPurchase,
    'owner_has_merchant' => l10n.errorOwnerHasMerchant,
    _ => l10n.errorGeneric,
  };
}
