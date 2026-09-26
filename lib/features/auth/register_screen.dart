import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/errors/app_failure.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/utils/validators.dart';
import '../../routes/route_paths.dart';
import '../../widgets/pill_button.dart';
import 'auth_providers.dart';
import 'widgets/auth_error_banner.dart';
import 'widgets/facebook_mark.dart';
import 'widgets/google_mark.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _loading = false;
  String? _error;
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _acceptedTerms = false;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_acceptedTerms) {
      setState(
        () => _error = 'Você precisa aceitar os Termos de Uso para continuar.',
      );
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ref
          .read(authRepositoryProvider)
          .signUpWithEmail(
            name: _nameController.text.trim(),
            email: _emailController.text.trim(),
            password: _passwordController.text,
            phone: '+55${_phoneController.text.replaceAll(RegExp(r'\D'), '')}',
          );
    } on AppFailure catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _socialSoon(String provider) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text('Login com $provider em breve.')));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: const BackButton(),
        title: const _StepIndicator(currentStep: 2, label: 'Criar conta'),
        centerTitle: false,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Crie sua conta',
                  style: AppTextStyles.h1.copyWith(fontSize: 28),
                ),
                const SizedBox(height: 8),
                Text(
                  'É rápido, gratuito e você já pode comprar e vender na sua região.',
                  style: AppTextStyles.bodyRegular.copyWith(
                    color: Colors.grey.shade600,
                  ),
                ),
                const SizedBox(height: 24),
                if (_error != null) AuthErrorBanner(message: _error!),
                TextFormField(
                  controller: _nameController,
                  decoration: const InputDecoration(
                    hintText: 'Seu nome completo',
                    prefixIcon: Icon(Icons.person_outline),
                  ),
                  validator: Validators.name,
                ),
                const SizedBox(height: 14),
                TextFormField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    hintText: 'Seu e-mail',
                    prefixIcon: Icon(Icons.mail_outline),
                  ),
                  validator: Validators.email,
                ),
                const SizedBox(height: 14),
                TextFormField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    hintText: 'Seu número de celular',
                    prefixIcon: Icon(Icons.phone_outlined),
                    prefixText: '🇧🇷 +55  ',
                  ),
                  validator: Validators.phone,
                ),
                const SizedBox(height: 14),
                TextFormField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  decoration: InputDecoration(
                    hintText: 'Crie uma senha',
                    prefixIcon: const Icon(Icons.lock_outline),
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
                const SizedBox(height: 14),
                TextFormField(
                  controller: _confirmPasswordController,
                  obscureText: _obscureConfirmPassword,
                  decoration: InputDecoration(
                    hintText: 'Confirme sua senha',
                    prefixIcon: const Icon(Icons.lock_outline),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscureConfirmPassword
                            ? Icons.visibility_off
                            : Icons.visibility,
                      ),
                      onPressed: () => setState(
                        () =>
                            _obscureConfirmPassword = !_obscureConfirmPassword,
                      ),
                    ),
                  ),
                  validator: Validators.confirmPassword(_passwordController),
                ),
                const SizedBox(height: 16),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Checkbox(
                      value: _acceptedTerms,
                      activeColor: AppColors.primary,
                      onChanged: (value) =>
                          setState(() => _acceptedTerms = value ?? false),
                    ),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.only(top: 12),
                        child: Text.rich(
                          TextSpan(
                            style: AppTextStyles.bodyRegular,
                            children: const [
                              TextSpan(text: 'Eu concordo com os '),
                              TextSpan(
                                text: 'Termos de Uso',
                                style: TextStyle(
                                  color: AppColors.secondary,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              TextSpan(text: ' e '),
                              TextSpan(
                                text: 'Política de Privacidade',
                                style: TextStyle(
                                  color: AppColors.secondary,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              TextSpan(text: ' do LeuPlace.'),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                PillButton(
                  label: 'Criar conta',
                  trailing: const Icon(
                    Icons.arrow_forward,
                    color: Colors.white,
                    size: 20,
                  ),
                  onPressed: _loading ? null : _submit,
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(child: Divider(color: Colors.grey.shade300)),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      child: Text('ou', style: AppTextStyles.caption),
                    ),
                    Expanded(child: Divider(color: Colors.grey.shade300)),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: PillButton(
                        label: 'Google',
                        filled: false,
                        icon: const GoogleMark(),
                        onPressed: () => _socialSoon('Google'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: PillButton(
                        label: 'Facebook',
                        filled: false,
                        icon: const FacebookMark(),
                        onPressed: () => _socialSoon('Facebook'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                Center(
                  child: TextButton(
                    onPressed: () => context.push(RoutePaths.login),
                    child: Text.rich(
                      TextSpan(
                        style: AppTextStyles.bodyRegular.copyWith(
                          color: Colors.grey.shade600,
                        ),
                        children: const [
                          TextSpan(text: 'Já tem uma conta? '),
                          TextSpan(
                            text: 'Entrar',
                            style: TextStyle(
                              color: AppColors.secondary,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
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

class _StepIndicator extends StatelessWidget {
  const _StepIndicator({required this.currentStep, required this.label});

  final int currentStep;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(3, (index) {
            final step = index + 1;
            final isActive = step <= currentStep;
            return Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (index > 0)
                  Container(
                    width: 16,
                    height: 2,
                    color: isActive ? AppColors.primary : Colors.grey.shade300,
                  ),
                CircleAvatar(
                  radius: 11,
                  backgroundColor: isActive
                      ? AppColors.primary
                      : Colors.grey.shade300,
                  child: Text(
                    '$step',
                    style: const TextStyle(
                      fontSize: 11,
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            );
          }),
        ),
        const SizedBox(height: 4),
        Text(label, style: AppTextStyles.caption),
      ],
    );
  }
}
