import 'package:firebase_auth/firebase_auth.dart';

import '../../core/errors/app_failure.dart';
import '../datasources/auth_remote_datasource.dart';
import '../models/user_model.dart';
import 'user_repository.dart';

/// Orquestra login/cadastro (e-mail, Google e telefone) garantindo que todo
/// usuário autenticado tenha um perfil correspondente na coleção `users`, e
/// traduz erros do Firebase em [AppFailure] amigáveis para a UI.
class AuthRepository {
  AuthRepository(this._authDataSource, this._userRepository);

  final AuthRemoteDataSource _authDataSource;
  final UserRepository _userRepository;

  Stream<User?> get authStateChanges => _authDataSource.authStateChanges;

  User? get currentUser => _authDataSource.currentUser;

  Future<void> signUpWithEmail({
    required String name,
    required String email,
    required String password,
    String? phone,
  }) async {
    try {
      final user = await _authDataSource.createUserWithEmail(email, password);
      if (user == null) {
        throw const AppFailure('Não foi possível criar sua conta.');
      }

      await _authDataSource.updateDisplayName(name);
      await _userRepository.createProfile(
        UserModel(
          uid: user.uid,
          name: name,
          email: email,
          phone: phone,
          createdAt: DateTime.now(),
        ),
      );
    } on FirebaseAuthException catch (e) {
      throw AppFailure.fromFirebaseAuth(e);
    }
  }

  Future<void> signInWithEmail({
    required String email,
    required String password,
  }) async {
    try {
      await _authDataSource.signInWithEmail(email, password);
    } on FirebaseAuthException catch (e) {
      throw AppFailure.fromFirebaseAuth(e);
    }
  }

  Future<void> signInWithGoogle() async {
    try {
      final user = await _authDataSource.signInWithGoogle();
      if (user != null) await _ensureProfileExists(user);
    } on FirebaseAuthException catch (e) {
      throw AppFailure.fromFirebaseAuth(e);
    }
  }

  Future<void> sendPhoneVerificationCode({
    required String phoneNumber,
    required void Function(String verificationId) onCodeSent,
  }) {
    return _authDataSource.sendPhoneVerificationCode(
      phoneNumber: phoneNumber,
      onCodeSent: onCodeSent,
      onError: (e) => throw AppFailure.fromFirebaseAuth(e),
    );
  }

  Future<void> confirmPhoneCode({
    required String verificationId,
    required String smsCode,
  }) async {
    try {
      final user = await _authDataSource.confirmSmsCode(
        verificationId: verificationId,
        smsCode: smsCode,
      );
      if (user != null) await _ensureProfileExists(user);
    } on FirebaseAuthException catch (e) {
      throw AppFailure.fromFirebaseAuth(e);
    }
  }

  Future<void> _ensureProfileExists(User firebaseUser) async {
    final existing = await _userRepository.getProfile(firebaseUser.uid);
    if (existing != null) return;

    await _userRepository.createProfile(
      UserModel(
        uid: firebaseUser.uid,
        name: firebaseUser.displayName ?? '',
        email: firebaseUser.email ?? '',
        phone: firebaseUser.phoneNumber,
        photoUrl: firebaseUser.photoURL,
        createdAt: DateTime.now(),
      ),
    );
  }

  Future<void> signOut() => _authDataSource.signOut();
}
