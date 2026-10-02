import '../data/api/api_client.dart';
import '../data/models/app_user.dart';
import '../data/repositories/auth_repository.dart';

/// Contas de demonstração, só na memória. Qualquer e-mail funciona;
/// um e-mail que comece com "comercio" entra como lojista.
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
    return _user(key);
  }

  @override
  Future<AppUser?> restore() async => null;

  @override
  Future<void> logout() async {}

  @override
  Future<void> deleteAccount() async {}

  AppUser _user(String email) {
    final isMerchant = email.startsWith('comercio');
    return AppUser(
      id: 'demo-$email',
      name: _names[email] ?? (isMerchant ? 'La Bella Cucina' : 'Lucía'),
      email: email,
      role: isMerchant ? UserRole.merchant : UserRole.member,
      subscriptionActive: true,
      subscriptionEnd: DateTime.now().add(const Duration(days: 30)),
      merchantId: isMerchant ? 'p1' : null,
    );
  }

  Future<void> _delay() =>
      Future<void>.delayed(const Duration(milliseconds: 400));
}
