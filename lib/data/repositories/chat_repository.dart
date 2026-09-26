import '../datasources/chat_remote_datasource.dart';
import '../models/chat_model.dart';
import '../models/message_model.dart';

class ChatRepository {
  ChatRepository(this._dataSource);

  final ChatRemoteDataSource _dataSource;

  Stream<List<ChatModel>> watchChatsForUser(String uid) {
    return _dataSource.watchChatsForUser(uid).map((snapshot) {
      final chats = snapshot.docs
          .map((doc) => ChatModel.fromMap(doc.id, doc.data()))
          .toList();
      chats.sort((a, b) => b.lastMessageAt.compareTo(a.lastMessageAt));
      return chats;
    });
  }

  Stream<ChatModel?> watchChat(String chatId) {
    return _dataSource.watchChat(chatId).map((doc) {
      if (!doc.exists) return null;
      return ChatModel.fromMap(doc.id, doc.data()!);
    });
  }

  Future<String> findOrCreateChat({
    required String productId,
    required String buyerId,
    required String sellerId,
  }) {
    return _dataSource.findOrCreateChat(
      productId: productId,
      buyerId: buyerId,
      sellerId: sellerId,
    );
  }

  Stream<List<MessageModel>> watchMessages(String chatId) {
    return _dataSource.watchMessages(chatId).map((snapshot) {
      return snapshot.docs
          .map((doc) => MessageModel.fromMap(doc.id, doc.data()))
          .toList();
    });
  }

  Future<void> sendMessage({
    required String chatId,
    required String senderId,
    String text = '',
    String? imageUrl,
  }) {
    return _dataSource.sendMessage(
      chatId: chatId,
      senderId: senderId,
      text: text,
      imageUrl: imageUrl,
    );
  }
}
