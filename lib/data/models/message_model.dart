import 'package:cloud_firestore/cloud_firestore.dart';

/// Mensagem individual de um chat, coleção `messages`. Uma mensagem tem texto
/// ou uma imagem (nunca as duas, para manter o modelo simples).
class MessageModel {
  final String id;
  final String chatId;
  final String senderId;
  final String text;
  final String? imageUrl;
  final DateTime sentAt;

  const MessageModel({
    required this.id,
    required this.chatId,
    required this.senderId,
    this.text = '',
    this.imageUrl,
    required this.sentAt,
  });

  bool get isImage => imageUrl != null && imageUrl!.isNotEmpty;

  factory MessageModel.fromMap(String id, Map<String, dynamic> map) {
    final sentAt = map['sentAt'];
    return MessageModel(
      id: id,
      chatId: map['chatId'] as String? ?? '',
      senderId: map['senderId'] as String? ?? '',
      text: map['text'] as String? ?? '',
      imageUrl: map['imageUrl'] as String?,
      sentAt: sentAt is Timestamp ? sentAt.toDate() : DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'chatId': chatId,
      'senderId': senderId,
      'text': text,
      'imageUrl': imageUrl,
      'sentAt': Timestamp.fromDate(sentAt),
    };
  }
}
