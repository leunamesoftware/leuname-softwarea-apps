import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/services/firebase_instances.dart';
import '../../data/datasources/product_remote_datasource.dart';
import '../../data/models/product_model.dart';
import '../../data/repositories/product_repository.dart';

final productRemoteDataSourceProvider = Provider<ProductRemoteDataSource>((
  ref,
) {
  return ProductRemoteDataSource(ref.watch(firestoreProvider));
});

final productRepositoryProvider = Provider<ProductRepository>((ref) {
  return ProductRepository(ref.watch(productRemoteDataSourceProvider));
});

/// Anúncios ativos mais recentes (usado na Home — "Anúncios perto de você";
/// filtro por localização real chega na Fase 3/4 avançada).
final nearbyProductsProvider = StreamProvider<List<ProductModel>>((ref) {
  return ref.watch(productRepositoryProvider).watchActiveProducts();
});

final productDetailProvider = StreamProvider.family<ProductModel?, String>((
  ref,
  productId,
) {
  return ref.watch(productRepositoryProvider).watchById(productId);
});

final productsByCategoryProvider =
    StreamProvider.family<List<ProductModel>, String>((ref, categoryId) {
      return ref.watch(productRepositoryProvider).watchByCategory(categoryId);
    });

/// Estado da tela de Buscar: texto digitado e categoria selecionada (quando
/// a busca chega a partir de um toque na grade de Categorias).
final searchQueryProvider = StateProvider<String>((ref) => '');
final categoryFilterProvider = StateProvider<String?>((ref) => null);

final searchResultsProvider = StreamProvider<List<ProductModel>>((ref) {
  final categoryId = ref.watch(categoryFilterProvider);
  final query = ref.watch(searchQueryProvider);

  final repository = ref.watch(productRepositoryProvider);
  if (categoryId != null) return repository.watchByCategory(categoryId);
  return repository.searchByTitle(query);
});
