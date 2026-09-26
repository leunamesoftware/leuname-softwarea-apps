import 'package:cloud_firestore/cloud_firestore.dart';

/// Mensagem individual de um chat, coleção `messages`.
class MessageModel {
  final String id;
  final String chatId;
  final String senderId;
  final String text;
  final DateTime sentAt;

  const MessageModel({
    required this.id,
    required this.chatId,
    required this.senderId,
    required this.text,
    required this.sentAt,
  });

  factory MessageModel.fromMap(String id, Map<String, dynamic> map) {
    final sentAt = map['sentAt'];
    return MessageModel(
      id: id,
      chatId: map['chatId'] as String? ?? '',
      senderId: map['senderId'] as String? ?? '',
      text: map['text'] as String? ?? '',
      sentAt: sentAt is Timestamp ? sentAt.toDate() : DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'chatId': chatId,
      'senderId': senderId,
      'text': text,
      'sentAt': Timestamp.fromDate(sentAt),
    };
  }
}
