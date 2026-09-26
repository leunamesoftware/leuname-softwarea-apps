import '../datasources/user_remote_datasource.dart';
import '../models/user_model.dart';

/// Regras de leitura/escrita do perfil do usuário, isolando o Firestore do
/// resto do app.
class UserRepository {
  UserRepository(this._dataSource);

  final UserRemoteDataSource _dataSource;

  Future<void> createProfile(UserModel user) {
    return _dataSource.setUser(user.uid, user.toMap());
  }

  Future<UserModel?> getProfile(String uid) async {
    final doc = await _dataSource.getUser(uid);
    if (!doc.exists) return null;
    return UserModel.fromMap(doc.id, doc.data()!);
  }

  Stream<UserModel?> watchProfile(String uid) {
    return _dataSource.watchUser(uid).map((doc) {
      if (!doc.exists) return null;
      return UserModel.fromMap(doc.id, doc.data()!);
    });
  }

  Future<void> updateProfile(
    String uid, {
    String? name,
    String? phone,
    String? photoUrl,
  }) {
    final data = <String, dynamic>{};
    if (name != null) data['name'] = name;
    if (phone != null) data['phone'] = phone;
    if (photoUrl != null) data['photoUrl'] = photoUrl;
    return _dataSource.updateUser(uid, data);
  }
}
