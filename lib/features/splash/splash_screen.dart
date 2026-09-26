import 'package:flutter/material.dart';

import '../../widgets/app_logo.dart';

/// Tela de abertura do app: mostra a marca enquanto o estado de autenticação
/// é resolvido, então navega para a Home ou para o fluxo de login.
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment(0, -0.15),
            radius: 1.1,
            colors: [Color(0xFFFFF7EE), Color(0xFFFF8A3D), Color(0xFFE0470D)],
            stops: [0.0, 0.55, 1.0],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              const Spacer(flex: 3),
              const AppLogo(markSize: 160, wordmarkFontSize: 44),
              const Spacer(flex: 2),
              SizedBox(
                width: 180,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: const LinearProgressIndicator(
                    minHeight: 6,
                    backgroundColor: Colors.white24,
                    valueColor: AlwaysStoppedAnimation(Colors.white),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                'Carregando...',
                style: TextStyle(color: Colors.white70, fontSize: 13),
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }
}
