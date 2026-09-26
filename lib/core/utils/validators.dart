import 'package:flutter/widgets.dart';

/// Validações simples de formulário usadas nas telas de autenticação.
abstract final class Validators {
  static final _emailRegex = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');

  static String? name(String? value) {
    if (value == null || value.trim().length < 2) return 'Informe seu nome.';
    return null;
  }

  static String? email(String? value) {
    if (value == null || value.trim().isEmpty) return 'Informe seu e-mail.';
    if (!_emailRegex.hasMatch(value.trim())) return 'E-mail inválido.';
    return null;
  }

  static String? password(String? value) {
    if (value == null || value.length < 6) {
      return 'A senha precisa ter pelo menos 6 caracteres.';
    }
    return null;
  }

  static String? phone(String? value) {
    final digits = value?.replaceAll(RegExp(r'\D'), '') ?? '';
    if (digits.length < 10 || digits.length > 11) return 'Celular inválido.';
    return null;
  }

  static String? Function(String?) confirmPassword(
    TextEditingController passwordController,
  ) {
    return (value) {
      if (value != passwordController.text) return 'As senhas não coincidem.';
      return null;
    };
  }
}
