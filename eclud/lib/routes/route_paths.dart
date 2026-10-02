/// Caminhos de rota centralizados, evitando strings soltas nas telas.
abstract final class RoutePaths {
  static const String onboarding = '/';
  static const String home = '/inicio';
  static const String map = '/mapa';
  static const String savings = '/ahorro';
  static const String profile = '/perfil';

  static const String favorites = '/favoritos';
  static const String subscribe = '/suscripcion';
  static const String forgotPassword = '/recuperar';
  static const String register = '/registro';
  static const String login = '/entrar';
  static const String merchant = '/comercio';
  static const String admin = '/admin';
  static const String adminNewMerchant = '/admin/nuevo';

  static String partner(String id) => '/local/$id';
  static String redeem(String id) => '/local/$id/canjear';
}
