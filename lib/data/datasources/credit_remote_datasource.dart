import 'package:cloud_firestore/cloud_firestore.dart';

import '../../core/constants/firestore_paths.dart';

/// Acesso ao histórico de créditos, subcoleção de `users`.
class CreditRemoteDataSource {
  CreditRemoteDataSource(this._firestore);

  final FirebaseFirestore _firestore;

  Stream<QuerySnapshot<Map<String, dynamic>>> watchHistory(String uid) {
    return _firestore
        .collection(FirestorePaths.users)
        .doc(uid)
        .collection('credit_transactions')
        .orderBy('createdAt', descending: true)
        .limit(50)
        .snapshots();
  }
}
