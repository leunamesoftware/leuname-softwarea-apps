import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/services/firebase_instances.dart';
import '../../data/datasources/credit_remote_datasource.dart';
import '../../data/models/credit_transaction_model.dart';
import '../../data/repositories/credit_repository.dart';
import '../auth/auth_providers.dart';

final creditRemoteDataSourceProvider = Provider<CreditRemoteDataSource>((ref) {
  return CreditRemoteDataSource(ref.watch(firestoreProvider));
});

final creditRepositoryProvider = Provider<CreditRepository>((ref) {
  return CreditRepository(ref.watch(creditRemoteDataSourceProvider));
});

final creditHistoryProvider = StreamProvider<List<CreditTransactionModel>>((
  ref,
) {
  final uid = ref.watch(authStateChangesProvider).value?.uid;
  if (uid == null) return Stream.value(const []);
  return ref.watch(creditRepositoryProvider).watchHistory(uid);
});
