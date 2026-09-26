import 'package:cloud_firestore/cloud_firestore.dart';

import '../datasources/product_remote_datasource.dart';
import '../models/product_model.dart';

/// Regras de leitura de anúncios. Escrita (criar/editar/pausar/marcar
/// vendido) chega na Fase 5.
class ProductRepository {
  ProductRepository(this._dataSource);

  final ProductRemoteDataSource _dataSource;

  Stream<List<ProductModel>> watchActiveProducts() {
    return _dataSource.watchActiveProducts().map(_mapDocs);
  }

  Stream<List<ProductModel>> watchByCategory(String categoryId) {
    return _dataSource.watchByCategory(categoryId).map(_mapDocs);
  }

  /// Publica o anúncio consumindo 1 crédito do vendedor. Lança [StateError]
  /// quando não há créditos disponíveis.
  Future<void> publish(ProductModel product) {
    return _dataSource.publishWithCredit(
      sellerId: product.sellerId,
      productData: product.toMap(),
    );
  }

  Stream<ProductModel?> watchById(String id) {
    return _dataSource.watchById(id).map((doc) {
      if (!doc.exists) return null;
      return ProductModel.fromMap(doc.id, doc.data()!);
    });
  }

  Stream<List<ProductModel>> watchMyProducts(String sellerId) {
    return _dataSource.watchBySeller(sellerId).map(_mapDocs);
  }

  Future<void> pause(String productId) =>
      _dataSource.updateStatus(productId, 'paused');

  Future<void> activate(String productId) =>
      _dataSource.updateStatus(productId, 'active');

  Future<void> delete(String productId) => _dataSource.delete(productId);

  Stream<List<ProductModel>> searchByTitle(String query) {
    if (query.trim().isEmpty) return watchActiveProducts();
    return _dataSource.watchByTitlePrefix(query.trim()).map(_mapDocs);
  }

  List<ProductModel> _mapDocs(QuerySnapshot<Map<String, dynamic>> snapshot) {
    return snapshot.docs
        .map((doc) => ProductModel.fromMap(doc.id, doc.data()))
        .toList();
  }
}
