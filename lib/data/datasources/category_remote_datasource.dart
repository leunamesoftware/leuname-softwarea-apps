import 'package:cloud_firestore/cloud_firestore.dart';

import '../../core/constants/firestore_paths.dart';

/// Acesso bruto à coleção `categories` no Firestore.
class CategoryRemoteDataSource {
  CategoryRemoteDataSource(this._firestore);

  final FirebaseFirestore _firestore;

  // Ordena só por `order` (sem filtro composto) para não exigir um índice
  // do Firestore; a filtragem por `active` é feita no repositório.
  Stream<QuerySnapshot<Map<String, dynamic>>> watchCategories() {
    return _firestore
        .collection(FirestorePaths.categories)
        .orderBy('order')
        .snapshots();
  }
}
