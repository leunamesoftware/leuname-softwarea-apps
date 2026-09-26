import 'package:cloud_firestore/cloud_firestore.dart';

/// Produto favoritado por um usuário, coleção `favorites`.
class FavoriteModel {
  final String id;
  final String userId;
  final String productId;
  final DateTime createdAt;

  const FavoriteModel({
    required this.id,
    required this.userId,
    required this.productId,
    required this.createdAt,
  });

  factory FavoriteModel.fromMap(String id, Map<String, dynamic> map) {
    final createdAt = map['createdAt'];
    return FavoriteModel(
      id: id,
      userId: map['userId'] as String? ?? '',
      productId: map['productId'] as String? ?? '',
      createdAt: createdAt is Timestamp ? createdAt.toDate() : DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'productId': productId,
      'createdAt': Timestamp.fromDate(createdAt),
    };
  }
}
