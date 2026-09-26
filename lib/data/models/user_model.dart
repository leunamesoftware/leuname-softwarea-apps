import 'package:cloud_firestore/cloud_firestore.dart';

import 'user_role.dart';

/// Perfil do usuário armazenado na coleção `users`.
class UserModel {
  final String uid;
  final String name;
  final String email;
  final String? phone;
  final String? photoUrl;
  final UserRole role;
  final DateTime createdAt;

  const UserModel({
    required this.uid,
    required this.name,
    required this.email,
    this.phone,
    this.photoUrl,
    this.role = UserRole.user,
    required this.createdAt,
  });

  bool get isAdmin => role == UserRole.admin;

  factory UserModel.fromMap(String uid, Map<String, dynamic> map) {
    final createdAt = map['createdAt'];
    return UserModel(
      uid: uid,
      name: map['name'] as String? ?? '',
      email: map['email'] as String? ?? '',
      phone: map['phone'] as String?,
      photoUrl: map['photoUrl'] as String?,
      role: UserRole.fromString(map['role'] as String?),
      createdAt: createdAt is Timestamp ? createdAt.toDate() : DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'name': name,
      'email': email,
      'phone': phone,
      'photoUrl': photoUrl,
      'role': role.name,
      'createdAt': Timestamp.fromDate(createdAt),
    };
  }

  UserModel copyWith({String? name, String? phone, String? photoUrl}) {
    return UserModel(
      uid: uid,
      name: name ?? this.name,
      email: email,
      phone: phone ?? this.phone,
      photoUrl: photoUrl ?? this.photoUrl,
      role: role,
      createdAt: createdAt,
    );
  }
}
