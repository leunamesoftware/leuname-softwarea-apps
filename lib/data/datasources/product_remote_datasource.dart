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

  /// Nulo apenas na prévia de demonstração (sem backend real) — [FakeProductRepository]
  /// sobrescreve todo método que o usaria, então nunca é lido de verdade.
  final FirebaseFirestore? _firestore;

  CollectionReference<Map<String, dynamic>> get _collection =>
      _firestore!.collection(FirestorePaths.products);

  Stream<DocumentSnapshot<Map<String, dynamic>>> watchById(String id) {
    return _collection.doc(id).snapshots();
  }

  /// Todos os anúncios do vendedor (qualquer status) — tela "Meus anúncios".
  Stream<QuerySnapshot<Map<String, dynamic>>> watchBySeller(String sellerId) {
    return _collection
        .where('sellerId', isEqualTo: sellerId)
        .orderBy('createdAt', descending: true)
        .snapshots();
  }

  Future<void> updateStatus(String productId, String status) {
    return _collection.doc(productId).update({'status': status});
  }

  Future<void> delete(String productId) {
    return _collection.doc(productId).delete();
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

  /// Cria o anúncio e desconta 1 crédito do vendedor numa única transação —
  /// ou os dois acontecem, ou nenhum. Reforçado do lado do servidor pelas
  /// regras do Firestore (`products` exige `adCredits > 0` para criar).
  Future<void> publishWithCredit({
    required String sellerId,
    required Map<String, dynamic> productData,
  }) {
    final userRef = _firestore!.collection(FirestorePaths.users).doc(sellerId);
    final productRef = _collection.doc();

    return _firestore.runTransaction((transaction) async {
      final userSnap = await transaction.get(userRef);
      final credits = (userSnap.data()?['adCredits'] as num?)?.toInt() ?? 0;
      if (credits <= 0) {
        throw StateError('Você não tem créditos de anúncio disponíveis.');
      }
      transaction.update(userRef, {'adCredits': credits - 1});
      transaction.set(productRef, productData);

      final historyRef = userRef.collection('credit_transactions').doc();
      transaction.set(historyRef, {
        'type': 'usage',
        'amount': -1,
        'description': 'Criação de anúncio: ${productData['title']}',
        'createdAt': Timestamp.now(),
      });
    });
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
