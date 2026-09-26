import 'package:cloud_firestore/cloud_firestore.dart';

import 'product_status.dart';

/// Anúncio de produto, coleção `products`.
/// Estrutura de dados definida na Fase 1; telas de criação/edição e regras de
/// validade (40 dias), quantidade e negociação chegam na Fase 5 em diante.
class ProductModel {
  final String id;
  final String sellerId;
  final String title;
  final String description;
  final double price;
  final List<String> imageUrls;
  final String categoryId;
  final String? subcategoryId;
  final ProductCondition condition;
  final int quantity;
  final ProductStatus status;

  // Localização (estrutura preparada para a Fase 3)
  final String state;
  final String city;
  final String region;

  final DateTime createdAt;
  final DateTime expiresAt;

  const ProductModel({
    required this.id,
    required this.sellerId,
    required this.title,
    required this.description,
    required this.price,
    this.imageUrls = const [],
    required this.categoryId,
    this.subcategoryId,
    this.condition = ProductCondition.usado,
    this.quantity = 1,
    this.status = ProductStatus.active,
    required this.state,
    required this.city,
    required this.region,
    required this.createdAt,
    required this.expiresAt,
  });

  bool get isExpired => DateTime.now().isAfter(expiresAt);

  factory ProductModel.fromMap(String id, Map<String, dynamic> map) {
    final createdAt = map['createdAt'];
    final expiresAt = map['expiresAt'];
    return ProductModel(
      id: id,
      sellerId: map['sellerId'] as String? ?? '',
      title: map['title'] as String? ?? '',
      description: map['description'] as String? ?? '',
      price: (map['price'] as num?)?.toDouble() ?? 0,
      imageUrls: List<String>.from(map['imageUrls'] as List? ?? const []),
      categoryId: map['categoryId'] as String? ?? '',
      subcategoryId: map['subcategoryId'] as String?,
      condition: ProductCondition.fromString(map['condition'] as String?),
      quantity: (map['quantity'] as num?)?.toInt() ?? 1,
      status: ProductStatus.fromString(map['status'] as String?),
      state: map['state'] as String? ?? '',
      city: map['city'] as String? ?? '',
      region: map['region'] as String? ?? '',
      createdAt: createdAt is Timestamp ? createdAt.toDate() : DateTime.now(),
      expiresAt: expiresAt is Timestamp ? expiresAt.toDate() : DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'sellerId': sellerId,
      'title': title,
      'description': description,
      'price': price,
      'imageUrls': imageUrls,
      'categoryId': categoryId,
      'subcategoryId': subcategoryId,
      'condition': condition.name,
      'quantity': quantity,
      'status': status.name,
      'state': state,
      'city': city,
      'region': region,
      'createdAt': Timestamp.fromDate(createdAt),
      'expiresAt': Timestamp.fromDate(expiresAt),
    };
  }
}
