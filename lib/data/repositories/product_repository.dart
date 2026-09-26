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

  Stream<ProductModel?> watchById(String id) {
    return _dataSource.watchById(id).map((doc) {
      if (!doc.exists) return null;
      return ProductModel.fromMap(doc.id, doc.data()!);
    });
  }

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
