import 'package:cloud_firestore/cloud_firestore.dart';

/// Estado de validação da venda, usado pelo programa de recompensas (Fase 10)
/// para evitar fraude no contador de vendas.
enum SaleValidation {
  declarada,
  validada;

  static SaleValidation fromString(String? value) {
    return SaleValidation.values.firstWhere(
      (v) => v.name == value,
      orElse: () => SaleValidation.declarada,
    );
  }
}

/// Registro histórico de venda, coleção `sales`.
class SaleModel {
  final String id;
  final String productId;
  final String sellerId;
  final String buyerId;
  final double listedPrice;
  final double agreedPrice;
  final SaleValidation validation;
  final DateTime soldAt;

  const SaleModel({
    required this.id,
    required this.productId,
    required this.sellerId,
    required this.buyerId,
    required this.listedPrice,
    required this.agreedPrice,
    this.validation = SaleValidation.declarada,
    required this.soldAt,
  });

  factory SaleModel.fromMap(String id, Map<String, dynamic> map) {
    final soldAt = map['soldAt'];
    return SaleModel(
      id: id,
      productId: map['productId'] as String? ?? '',
      sellerId: map['sellerId'] as String? ?? '',
      buyerId: map['buyerId'] as String? ?? '',
      listedPrice: (map['listedPrice'] as num?)?.toDouble() ?? 0,
      agreedPrice: (map['agreedPrice'] as num?)?.toDouble() ?? 0,
      validation: SaleValidation.fromString(map['validation'] as String?),
      soldAt: soldAt is Timestamp ? soldAt.toDate() : DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'productId': productId,
      'sellerId': sellerId,
      'buyerId': buyerId,
      'listedPrice': listedPrice,
      'agreedPrice': agreedPrice,
      'validation': validation.name,
      'soldAt': Timestamp.fromDate(soldAt),
    };
  }
}
