/// Caminhos de rota centralizados, evitando strings soltas nas telas.
abstract final class RoutePaths {
  static const String splash = '/splash';
  static const String welcome = '/welcome';
  static const String login = '/login';
  static const String register = '/register';

  static const String home = '/home';
  static const String search = '/search';

  /// Aba "Anunciar" da navegação principal: mostra "Meus anúncios".
  static const String myProducts = '/anunciar';

  static const String chat = '/chat';
  static const String profile = '/profile';

  static const String categories = '/categories';
  static const String createProduct = '/anunciar/novo';
  static const String credits = '/creditos';
  static String productDetail(String id) => '/produto/$id';
  static String chatDetail(String id) => '/chat/$id';
}
