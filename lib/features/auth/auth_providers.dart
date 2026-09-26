import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/services/firebase_instances.dart';
import '../../data/datasources/auth_remote_datasource.dart';
import '../../data/datasources/user_remote_datasource.dart';
import '../../data/models/user_model.dart';
import '../../data/repositories/auth_repository.dart';
import '../../data/repositories/user_repository.dart';

final authRemoteDataSourceProvider = Provider<AuthRemoteDataSource>((ref) {
  return AuthRemoteDataSource(
    ref.watch(firebaseAuthProvider),
    ref.watch(googleSignInProvider),
  );
});

final userRemoteDataSourceProvider = Provider<UserRemoteDataSource>((ref) {
  return UserRemoteDataSource(ref.watch(firestoreProvider));
});

final userRepositoryProvider = Provider<UserRepository>((ref) {
  return UserRepository(ref.watch(userRemoteDataSourceProvider));
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    ref.watch(authRemoteDataSourceProvider),
    ref.watch(userRepositoryProvider),
  );
});

/// Emite o usuário autenticado (ou `null`) sempre que o estado de login muda.
final authStateChangesProvider = StreamProvider<User?>((ref) {
  return ref.watch(authRepositoryProvider).authStateChanges;
});

/// Perfil (com papel/permissões) do usuário atualmente autenticado.
final currentUserProfileProvider = StreamProvider<UserModel?>((ref) {
  final uid = ref.watch(authStateChangesProvider).value?.uid;
  if (uid == null) return Stream.value(null);
  return ref.watch(userRepositoryProvider).watchProfile(uid);
});

/// Atalho para checagem de permissão de administrador na UI.
final isAdminProvider = Provider<bool>((ref) {
  return ref.watch(currentUserProfileProvider).value?.isAdmin ?? false;
});

/// Perfil público de qualquer usuário (ex.: dados do vendedor na tela de
/// produto), buscado uma única vez por uid.
final userProfileProvider = FutureProvider.family<UserModel?, String>((
  ref,
  uid,
) {
  return ref.watch(userRepositoryProvider).getProfile(uid);
});
