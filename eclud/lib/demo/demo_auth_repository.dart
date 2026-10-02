import '../data/api/api_client.dart';
import '../data/models/app_user.dart';
import '../data/repositories/auth_repository.dart';

/// Contas de demonstração, só na memória. Qualquer e-mail funciona;
/// um e-mail que comece com "comercio" entra como lojista e um que comece
/// com "admin", como administrador. Código de recuperação de senha: 123456.
class DemoAuthRepository implements AuthRepository {
  final _passwords = <String, String>{};
  final _names = <String, String>{};

  @override
  Future<AppUser> register({
    required String name,
    required String email,
    required String password,
  }) async {
    await _delay();
    final key = email.trim().toLowerCase();
    if (_passwords.containsKey(key)) {
      throw const ApiException(409, 'email_taken');
    }
    _passwords[key] = password;
    _names[key] = name.trim();
    _current = key;
    return _user(key);
  }

  @override
  Future<AppUser> login({
    required String email,
    required String password,
  }) async {
    await _delay();
    final key = email.trim().toLowerCase();
    final saved = _passwords[key];
    if (saved != null && saved != password) {
      throw const ApiException(401, 'invalid_credentials');
    }
    _current = key;
    return _user(key);
  }

  String? _current;

  @override
  Future<AppUser?> restore() async =>
      _current == null ? null : _user(_current!);

  @override
  Future<void> logout() async => _current = null;

  @override
  Future<void> deleteAccount() async {}

  static const demoResetCode = '123456';

  @override
  Future<void> requestPasswordReset(String email) => _delay();

  @override
  Future<AppUser> resetPassword({
    required String email,
    required String code,
    required String password,
  }) async {
    await _delay();
    if (code != demoResetCode) throw const ApiException(400, 'invalid_code');
    final key = email.trim().toLowerCase();
    _passwords[key] = password;
    return _user(key);
  }

  /// Simula a compra da assinatura na demonstração.
  bool subscribed = false;

  AppUser _user(String email) {
    final isMerchant = email.startsWith('comercio');
    final isAdmin = email.startsWith('admin');
    return AppUser(
      id: 'demo-$email',
      name: _names[email] ?? (isMerchant ? 'La Bella Cucina' : 'Lucía'),
      email: email,
      role: isAdmin
          ? UserRole.admin
          : isMerchant
          ? UserRole.merchant
          : UserRole.member,
      subscriptionActive: subscribed,
      subscriptionEnd: subscribed
          ? DateTime.now().add(const Duration(days: 30))
          : null,
      merchantId: isMerchant ? 'p1' : null,
    );
  }

  Future<void> _delay() =>
      Future<void>.delayed(const Duration(milliseconds: 400));
}
