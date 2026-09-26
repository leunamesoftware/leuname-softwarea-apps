import 'package:cloud_firestore/cloud_firestore.dart';

import '../../core/constants/firestore_paths.dart';

/// Acesso bruto à coleção `products`. Os métodos abaixo cobrem apenas leitura
/// (Fase 4 — busca); criação/edição de anúncios chegam na Fase 5.
///
/// Cada método usa uma única combinação de `where`+`orderBy` para exigir no
/// máximo um índice composto por consulta — mantém o Firestore simples de
/// configurar. Filtros adicionais (preço, distância) são aplicados no
/// repositório, em memória.
class ProductRemoteDataSource {
  ProductRemoteDataSource(this._firestore);

  final FirebaseFirestore _firestore;

  CollectionReference<Map<String, dynamic>> get _collection =>
      _firestore.collection(FirestorePaths.products);

  Stream<DocumentSnapshot<Map<String, dynamic>>> watchById(String id) {
    return _collection.doc(id).snapshots();
  }

  Stream<QuerySnapshot<Map<String, dynamic>>> watchActiveProducts({
    int limit = 30,
  }) {
    return _collection
        .where('status', isEqualTo: 'active')
        .orderBy('createdAt', descending: true)
        .limit(limit)
        .snapshots();
  }

  Stream<QuerySnapshot<Map<String, dynamic>>> watchByCategory(
    String categoryId, {
    int limit = 30,
  }) {
    return _collection
        .where('status', isEqualTo: 'active')
        .where('categoryId', isEqualTo: categoryId)
        .orderBy('createdAt', descending: true)
        .limit(limit)
        .snapshots();
  }

  Stream<QuerySnapshot<Map<String, dynamic>>> watchByTitlePrefix(
    String prefix, {
    int limit = 30,
  }) {
    final lower = prefix.toLowerCase();
    return _collection
        .where('status', isEqualTo: 'active')
        .orderBy('titleLower')
        .startAt([lower])
        .endAt(['$lower'])
        .limit(limit)
        .snapshots();
  }
}
