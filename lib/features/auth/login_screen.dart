import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/errors/app_failure.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/utils/validators.dart';
import '../../routes/route_paths.dart';
import 'auth_providers.dart';
import 'widgets/auth_error_banner.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _loading = false;
  String? _error;
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ref
          .read(authRepositoryProvider)
          .signInWithEmail(
            email: _emailController.text.trim(),
            password: _passwordController.text,
          );
    } on AppFailure catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Entrar')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Entre com seu e-mail', style: AppTextStyles.h1),
                const SizedBox(height: 24),
                if (_error != null) AuthErrorBanner(message: _error!),
                TextFormField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(hintText: 'E-mail'),
                  validator: Validators.email,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  decoration: InputDecoration(
                    hintText: 'Senha',
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscurePassword
                            ? Icons.visibility_off
                            : Icons.visibility,
                      ),
                      onPressed: () =>
                          setState(() => _obscurePassword = !_obscurePassword),
                    ),
                  ),
                  validator: Validators.password,
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: _loading ? null : _submit,
                  child: _loading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text('Entrar'),
                ),
                const SizedBox(height: 16),
                Center(
                  child: TextButton(
                    onPressed: () => context.push(RoutePaths.register),
                    child: const Text(
                      'Ainda não tem conta? Criar conta',
                      style: TextStyle(color: AppColors.secondary),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
