/// Caminhos de rota centralizados, evitando strings soltas nas telas.
abstract final class RoutePaths {
  static const String onboarding = '/';
  static const String home = '/inicio';
  static const String map = '/mapa';
  static const String savings = '/ahorro';
  static const String profile = '/perfil';

  static const String register = '/registro';
  static const String login = '/entrar';
  static const String merchant = '/comercio';

  static String partner(String id) => '/local/$id';
  static String redeem(String id) => '/local/$id/canjear';
}
