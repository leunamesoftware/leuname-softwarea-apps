import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/services/firebase_instances.dart';
import '../../data/datasources/chat_remote_datasource.dart';
import '../../data/models/chat_model.dart';
import '../../data/models/message_model.dart';
import '../../data/repositories/chat_repository.dart';
import '../auth/auth_providers.dart';

final chatRemoteDataSourceProvider = Provider<ChatRemoteDataSource>((ref) {
  return ChatRemoteDataSource(ref.watch(firestoreProvider));
});

final chatRepositoryProvider = Provider<ChatRepository>((ref) {
  return ChatRepository(ref.watch(chatRemoteDataSourceProvider));
});

/// Conversas do usuário autenticado (comprador ou vendedor), mais recentes
/// primeiro.
final myChatsProvider = StreamProvider<List<ChatModel>>((ref) {
  final uid = ref.watch(authStateChangesProvider).value?.uid;
  if (uid == null) return Stream.value(const []);
  return ref.watch(chatRepositoryProvider).watchChatsForUser(uid);
});

final chatDetailProvider = StreamProvider.family<ChatModel?, String>((
  ref,
  chatId,
) {
  return ref.watch(chatRepositoryProvider).watchChat(chatId);
});

final chatMessagesProvider = StreamProvider.family<List<MessageModel>, String>((
  ref,
  chatId,
) {
  return ref.watch(chatRepositoryProvider).watchMessages(chatId);
});
