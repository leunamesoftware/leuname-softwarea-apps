/// Papel do usuário dentro da plataforma, usado para controle de permissões
/// tanto no app quanto nas regras de segurança do Firestore.
enum UserRole {
  user,
  admin;

  static UserRole fromString(String? value) {
    return UserRole.values.firstWhere(
      (role) => role.name == value,
      orElse: () => UserRole.user,
    );
  }
}
