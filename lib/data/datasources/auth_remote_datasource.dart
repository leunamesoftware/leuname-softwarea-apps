import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';

/// Acesso bruto ao Firebase Auth e ao Google Sign-In — sem regra de negócio.
/// A camada de repositório decide o que fazer com o resultado.
class AuthRemoteDataSource {
  AuthRemoteDataSource(this._firebaseAuth, this._googleSignIn);

  /// Nulos apenas na prévia de demonstração — [FakeAuthRepository] nunca lê.
  final FirebaseAuth? _firebaseAuth;
  final GoogleSignIn? _googleSignIn;

  Stream<User?> get authStateChanges => _firebaseAuth!.authStateChanges();

  User? get currentUser => _firebaseAuth!.currentUser;

  Future<User?> createUserWithEmail(String email, String password) async {
    final credential = await _firebaseAuth!.createUserWithEmailAndPassword(
      email: email,
      password: password,
    );
    return credential.user;
  }

  Future<User?> signInWithEmail(String email, String password) async {
    final credential = await _firebaseAuth!.signInWithEmailAndPassword(
      email: email,
      password: password,
    );
    return credential.user;
  }

  Future<User?> signInWithGoogle() async {
    final googleUser = await _googleSignIn!.authenticate();
    final googleAuth = googleUser.authentication;
    final credential = GoogleAuthProvider.credential(
      idToken: googleAuth.idToken,
    );
    final userCredential = await _firebaseAuth!.signInWithCredential(
      credential,
    );
    return userCredential.user;
  }

  /// Envia o código SMS de verificação (login por telefone). O `verificationId`
  /// retornado em [onCodeSent] deve ser guardado para uso em [confirmSmsCode].
  Future<void> sendPhoneVerificationCode({
    required String phoneNumber,
    required void Function(String verificationId) onCodeSent,
    required void Function(FirebaseAuthException error) onError,
  }) {
    return _firebaseAuth!.verifyPhoneNumber(
      phoneNumber: phoneNumber,
      verificationCompleted: (credential) async {
        await _firebaseAuth.signInWithCredential(credential);
      },
      verificationFailed: onError,
      codeSent: (verificationId, _) => onCodeSent(verificationId),
      codeAutoRetrievalTimeout: (_) {},
    );
  }

  Future<User?> confirmSmsCode({
    required String verificationId,
    required String smsCode,
  }) async {
    final credential = PhoneAuthProvider.credential(
      verificationId: verificationId,
      smsCode: smsCode,
    );
    final userCredential = await _firebaseAuth!.signInWithCredential(
      credential,
    );
    return userCredential.user;
  }

  Future<void> updateDisplayName(String name) async {
    await _firebaseAuth!.currentUser?.updateDisplayName(name);
  }

  Future<void> signOut() async {
    await _googleSignIn!.signOut();
    await _firebaseAuth!.signOut();
  }
}
