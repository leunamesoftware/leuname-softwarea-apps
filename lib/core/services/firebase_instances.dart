import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';

/// Instâncias de baixo nível dos serviços do Firebase, injetadas via Riverpod.
/// Nenhuma regra de negócio deve viver aqui — só o acesso ao SDK.
final firebaseAuthProvider = Provider<FirebaseAuth>(
  (ref) => FirebaseAuth.instance,
);

final firestoreProvider = Provider<FirebaseFirestore>(
  (ref) => FirebaseFirestore.instance,
);

final googleSignInProvider = Provider<GoogleSignIn>(
  (ref) => GoogleSignIn.instance,
);
