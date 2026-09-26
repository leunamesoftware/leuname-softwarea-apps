import 'package:flutter/material.dart';

/// Selo "f" simples para o botão de login com Facebook — mesmo raciocínio do
/// [GoogleMark]: evita reproduzir o logótipo oficial completo.
class FacebookMark extends StatelessWidget {
  const FacebookMark({super.key, this.size = 20});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: const BoxDecoration(
        color: Color(0xFF1877F2),
        shape: BoxShape.circle,
      ),
      child: Center(
        child: Text(
          'f',
          style: TextStyle(
            fontSize: size * 0.72,
            fontWeight: FontWeight.w800,
            color: Colors.white,
            height: 1,
          ),
        ),
      ),
    );
  }
}
