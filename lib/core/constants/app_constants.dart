/// Constantes de regra de negócio da Fase 5/6. Quando o painel administrativo
/// (Fase 11) existir, estes valores passam a vir do documento `settings/app`
/// em vez de fixos aqui.
abstract final class AppConstants {
  static const int adValidityDays = 40;
  static const int maxProductImages = 10;
  static const int descriptionMaxLength = 500;
}
