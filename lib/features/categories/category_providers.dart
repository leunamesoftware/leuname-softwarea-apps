import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/services/firebase_instances.dart';
import '../../data/datasources/category_remote_datasource.dart';
import '../../data/models/category_model.dart';
import '../../data/repositories/category_repository.dart';

final categoryRemoteDataSourceProvider = Provider<CategoryRemoteDataSource>((
  ref,
) {
  return CategoryRemoteDataSource(ref.watch(firestoreProvider));
});

final categoryRepositoryProvider = Provider<CategoryRepository>((ref) {
  return CategoryRepository(ref.watch(categoryRemoteDataSourceProvider));
});

final categoriesProvider = StreamProvider<List<CategoryModel>>((ref) {
  return ref.watch(categoryRepositoryProvider).watchCategories();
});
