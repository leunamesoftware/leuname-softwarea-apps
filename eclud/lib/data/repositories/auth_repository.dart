import '../models/app_user.dart';

/// Conta do usuário: cadastro, login, sessão salva e exclusão.
abstract interface class AuthRepository {
  Future<AppUser> register({
    required String name,
    required String email,
    required String password,
  });

  Future<AppUser> login({required String email, required String password});

  /// Recupera a sessão salva no aparelho; `null` se não houver ou expirou.
  Future<AppUser?> restore();

  Future<void> logout();

  /// Apaga a conta e os dados pessoais (RGPD).
  Future<void> deleteAccount();
}
