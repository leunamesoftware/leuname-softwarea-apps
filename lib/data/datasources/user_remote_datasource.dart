import 'package:cloud_firestore/cloud_firestore.dart';

import '../../core/constants/firestore_paths.dart';

/// Acesso bruto à coleção `users` no Firestore — sem regra de negócio.
class UserRemoteDataSource {
  UserRemoteDataSource(this._firestore);

  final FirebaseFirestore _firestore;

  CollectionReference<Map<String, dynamic>> get _collection =>
      _firestore.collection(FirestorePaths.users);

  Future<void> setUser(String uid, Map<String, dynamic> data) {
    return _collection.doc(uid).set(data, SetOptions(merge: true));
  }

  Future<DocumentSnapshot<Map<String, dynamic>>> getUser(String uid) {
    return _collection.doc(uid).get();
  }

  Stream<DocumentSnapshot<Map<String, dynamic>>> watchUser(String uid) {
    return _collection.doc(uid).snapshots();
  }

  Future<void> updateUser(String uid, Map<String, dynamic> data) {
    return _collection.doc(uid).update(data);
  }
}
