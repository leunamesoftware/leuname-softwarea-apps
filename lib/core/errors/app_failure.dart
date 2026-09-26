import 'package:firebase_auth/firebase_auth.dart';

/// Erro de aplicação com mensagem já traduzida para o usuário final.
/// Repositórios convertem exceções técnicas (Firebase, rede, etc.) para isto,
/// para que a camada de apresentação nunca precise conhecer detalhes do backend.
class AppFailure implements Exception {
  final String message;

  const AppFailure(this.message);

  factory AppFailure.fromFirebaseAuth(FirebaseAuthException e) {
    switch (e.code) {
      case 'invalid-email':
        return const AppFailure('E-mail inválido.');
      case 'user-disabled':
        return const AppFailure('Esta conta foi desativada.');
      case 'user-not-found':
      case 'wrong-password':
      case 'invalid-credential':
        return const AppFailure('E-mail ou senha incorretos.');
      case 'email-already-in-use':
        return const AppFailure('Este e-mail já está cadastrado.');
      case 'weak-password':
        return const AppFailure('A senha precisa ter pelo menos 6 caracteres.');
      case 'too-many-requests':
        return const AppFailure(
          'Muitas tentativas. Tente novamente em instantes.',
        );
      case 'network-request-failed':
        return const AppFailure('Falha de conexão. Verifique sua internet.');
      default:
        return const AppFailure(
          'Não foi possível concluir a operação. Tente novamente.',
        );
    }
  }

  @override
  String toString() => message;
}
