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

  /// Envia por e-mail um código de 6 dígitos para criar nova senha.
  Future<void> requestPasswordReset(String email);

  /// Troca a senha com o código recebido e já entra na conta.
  Future<AppUser> resetPassword({
    required String email,
    required String code,
    required String password,
  });
}
