import 'package:cloud_firestore/cloud_firestore.dart';

/// Status de análise de uma denúncia/reclamação, coleção `reports`.
enum ReportStatus {
  pendente,
  emAnalise,
  resolvida,
  rejeitada;

  static ReportStatus fromString(String? value) {
    return ReportStatus.values.firstWhere(
      (v) => v.name == value,
      orElse: () => ReportStatus.pendente,
    );
  }
}

/// Reclamação/denúncia registrada por um usuário, coleção `reports`.
class ReportModel {
  final String id;
  final String reporterId;
  final String? productId;
  final String? targetUserId;
  final String reason;
  final String? details;
  final ReportStatus status;
  final DateTime createdAt;

  const ReportModel({
    required this.id,
    required this.reporterId,
    this.productId,
    this.targetUserId,
    required this.reason,
    this.details,
    this.status = ReportStatus.pendente,
    required this.createdAt,
  });

  factory ReportModel.fromMap(String id, Map<String, dynamic> map) {
    final createdAt = map['createdAt'];
    return ReportModel(
      id: id,
      reporterId: map['reporterId'] as String? ?? '',
      productId: map['productId'] as String?,
      targetUserId: map['targetUserId'] as String?,
      reason: map['reason'] as String? ?? '',
      details: map['details'] as String?,
      status: ReportStatus.fromString(map['status'] as String?),
      createdAt: createdAt is Timestamp ? createdAt.toDate() : DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'reporterId': reporterId,
      'productId': productId,
      'targetUserId': targetUserId,
      'reason': reason,
      'details': details,
      'status': status.name,
      'createdAt': Timestamp.fromDate(createdAt),
    };
  }
}
