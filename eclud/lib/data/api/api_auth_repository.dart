import '../models/app_user.dart';
import '../repositories/auth_repository.dart';
import 'api_client.dart';

class ApiAuthRepository implements AuthRepository {
  ApiAuthRepository(this._api);

  final ApiClient _api;

  @override
  Future<AppUser> register({
    required String name,
    required String email,
    required String password,
  }) => _session(
    _api.post('/auth/register', {
      'name': name,
      'email': email,
      'password': password,
      'acceptTerms': true,
    }),
  );

  @override
  Future<AppUser> login({required String email, required String password}) =>
      _session(
        _api.post('/auth/login', {'email': email, 'password': password}),
      );

  Future<AppUser> _session(Future<dynamic> request) async {
    final json = await request as Map<String, dynamic>;
    await _api.tokens.write(json['token'] as String);
    return AppUser.fromJson(json['user'] as Map<String, dynamic>);
  }

  @override
  Future<AppUser?> restore() async {
    if (await _api.tokens.read() == null) return null;
    try {
      return AppUser.fromJson(await _api.get('/me') as Map<String, dynamic>);
    } on ApiException catch (e) {
      if (e.statusCode == 401) {
        await _api.tokens.clear();
        return null;
      }
      rethrow;
    }
  }

  @override
  Future<void> logout() => _api.tokens.clear();

  @override
  Future<void> deleteAccount() async {
    await _api.delete('/me');
    await _api.tokens.clear();
  }
}
