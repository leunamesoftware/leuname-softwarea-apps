import 'package:cloud_firestore/cloud_firestore.dart';

enum CreditTransactionType {
  purchase,
  usage;

  static CreditTransactionType fromString(String? value) {
    return CreditTransactionType.values.firstWhere(
      (v) => v.name == value,
      orElse: () => CreditTransactionType.usage,
    );
  }
}

/// Entrada no histórico de créditos do vendedor, subcoleção
/// `users/{uid}/credit_transactions`.
class CreditTransactionModel {
  final String id;
  final CreditTransactionType type;
  final int amount;
  final String description;
  final DateTime createdAt;

  const CreditTransactionModel({
    required this.id,
    required this.type,
    required this.amount,
    required this.description,
    required this.createdAt,
  });

  factory CreditTransactionModel.fromMap(String id, Map<String, dynamic> map) {
    final createdAt = map['createdAt'];
    return CreditTransactionModel(
      id: id,
      type: CreditTransactionType.fromString(map['type'] as String?),
      amount: (map['amount'] as num?)?.toInt() ?? 0,
      description: map['description'] as String? ?? '',
      createdAt: createdAt is Timestamp ? createdAt.toDate() : DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'type': type.name,
      'amount': amount,
      'description': description,
      'createdAt': Timestamp.fromDate(createdAt),
    };
  }
}
