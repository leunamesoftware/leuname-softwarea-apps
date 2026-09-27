import 'package:cloud_firestore/cloud_firestore.dart';

import '../../core/constants/firestore_paths.dart';

/// Acesso bruto às coleções `chats` e `messages`.
class ChatRemoteDataSource {
  ChatRemoteDataSource(this._firestore);

  /// Nulo apenas na prévia de demonstração — [FakeChatRepository] nunca lê.
  final FirebaseFirestore? _firestore;

  CollectionReference<Map<String, dynamic>> get _chats =>
      _firestore!.collection(FirestorePaths.chats);

  CollectionReference<Map<String, dynamic>> get _messages =>
      _firestore!.collection(FirestorePaths.messages);

  Stream<QuerySnapshot<Map<String, dynamic>>> watchChatsForUser(String uid) {
    return _chats.where('participants', arrayContains: uid).snapshots();
  }

  Stream<DocumentSnapshot<Map<String, dynamic>>> watchChat(String chatId) {
    return _chats.doc(chatId).snapshots();
  }

  /// Encontra o chat já existente entre comprador e vendedor para o produto,
  /// ou cria um novo. Evita duplicar conversas quando o comprador entra de
  /// novo na tela do produto.
  Future<String> findOrCreateChat({
    required String productId,
    required String buyerId,
    required String sellerId,
  }) async {
    final existing = await _chats
        .where('productId', isEqualTo: productId)
        .where('buyerId', isEqualTo: buyerId)
        .limit(1)
        .get();

    if (existing.docs.isNotEmpty) return existing.docs.first.id;

    final doc = await _chats.add({
      'productId': productId,
      'buyerId': buyerId,
      'sellerId': sellerId,
      'participants': [buyerId, sellerId],
      'lastMessage': '',
      'lastMessageAt': Timestamp.now(),
    });
    return doc.id;
  }

  Stream<QuerySnapshot<Map<String, dynamic>>> watchMessages(String chatId) {
    return _messages
        .where('chatId', isEqualTo: chatId)
        .orderBy('sentAt', descending: true)
        .snapshots();
  }

  Future<void> sendMessage({
    required String chatId,
    required String senderId,
    String text = '',
    String? imageUrl,
  }) async {
    final now = Timestamp.now();
    await _messages.add({
      'chatId': chatId,
      'senderId': senderId,
      'text': text,
      'imageUrl': imageUrl,
      'sentAt': now,
    });
    final preview = (imageUrl != null && imageUrl.isNotEmpty)
        ? '📷 Foto'
        : text;
    await _chats.doc(chatId).update({
      'lastMessage': preview,
      'lastMessageAt': now,
    });
  }
}
