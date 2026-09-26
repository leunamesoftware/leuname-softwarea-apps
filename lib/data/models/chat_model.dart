import 'package:cloud_firestore/cloud_firestore.dart';

/// Conversa entre comprador e vendedor sobre um produto, coleção `chats`.
/// As mensagens em si ficam na subcoleção/coleção `messages` (Fase 7).
class ChatModel {
  final String id;
  final String productId;
  final String buyerId;
  final String sellerId;
  final String lastMessage;
  final DateTime lastMessageAt;

  const ChatModel({
    required this.id,
    required this.productId,
    required this.buyerId,
    required this.sellerId,
    this.lastMessage = '',
    required this.lastMessageAt,
  });

  List<String> get participants => [buyerId, sellerId];

  factory ChatModel.fromMap(String id, Map<String, dynamic> map) {
    final lastMessageAt = map['lastMessageAt'];
    return ChatModel(
      id: id,
      productId: map['productId'] as String? ?? '',
      buyerId: map['buyerId'] as String? ?? '',
      sellerId: map['sellerId'] as String? ?? '',
      lastMessage: map['lastMessage'] as String? ?? '',
      lastMessageAt: lastMessageAt is Timestamp
          ? lastMessageAt.toDate()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'productId': productId,
      'buyerId': buyerId,
      'sellerId': sellerId,
      'participants': participants,
      'lastMessage': lastMessage,
      'lastMessageAt': Timestamp.fromDate(lastMessageAt),
    };
  }
}
