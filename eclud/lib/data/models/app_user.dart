enum UserRole { member, merchant, admin }

/// Usuário logado.
class AppUser {
  const AppUser({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.subscriptionActive = false,
    this.subscriptionEnd,
    this.merchantId,
  });

  final String id;
  final String name;
  final String email;
  final UserRole role;
  final bool subscriptionActive;
  final DateTime? subscriptionEnd;
  final String? merchantId;

  bool get isMerchant =>
      (role == UserRole.merchant || role == UserRole.admin) &&
      merchantId != null;

  bool get isAdmin => role == UserRole.admin;

  String get firstName => name.trim().split(RegExp(r'\s+')).first;

  factory AppUser.fromJson(Map<String, dynamic> json) {
    final sub = json['subscription'] as Map<String, dynamic>?;
    final end = sub == null
        ? null
        : DateTime.tryParse(sub['currentPeriodEnd'] as String? ?? '');
    return AppUser(
      id: json['id'] as String,
      name: json['name'] as String,
      email: json['email'] as String,
      role: UserRole.values.asNameMap()[json['role']] ?? UserRole.member,
      subscriptionActive:
          sub?['status'] == 'active' &&
          end != null &&
          end.isAfter(DateTime.now()),
      subscriptionEnd: end,
      merchantId: json['merchantId'] as String?,
    );
  }
}
