/// Nomes das coleções do Firestore. Centralizado para evitar strings soltas
/// espalhadas pelo código e manter o banco de dados consistente entre fases.
abstract final class FirestorePaths {
  static const String users = 'users';
  static const String products = 'products';
  static const String categories = 'categories';
  static const String subcategories = 'subcategories';
  static const String sales = 'sales';
  static const String chats = 'chats';
  static const String messages = 'messages';
  static const String favorites = 'favorites';
  static const String reports = 'reports';
  static const String settings = 'settings';
}
