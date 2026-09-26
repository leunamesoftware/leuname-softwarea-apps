import '../../core/constants/category_seed.dart';
import '../datasources/category_remote_datasource.dart';
import '../models/category_model.dart';

/// Lista de categorias ativas. Enquanto o Firestore do projeto não tiver
/// nenhuma categoria cadastrada (banco novo, painel admin ainda não usado —
/// Fase 11), cai para [CategorySeed.initial] como carga inicial.
class CategoryRepository {
  CategoryRepository(this._dataSource);

  final CategoryRemoteDataSource _dataSource;

  Stream<List<CategoryModel>> watchCategories() {
    return _dataSource.watchCategories().map((snapshot) {
      final categories = snapshot.docs
          .map((doc) => CategoryModel.fromMap(doc.id, doc.data()))
          .where((category) => category.active)
          .toList();
      return categories.isEmpty ? CategorySeed.initial : categories;
    });
  }
}
