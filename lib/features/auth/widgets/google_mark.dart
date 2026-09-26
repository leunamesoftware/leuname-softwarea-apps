import 'package:flutter/material.dart';

/// Selo "G" simples para o botão de login com Google — evita reproduzir o
/// logótipo colorido oficial (uso restrito) enquanto mantém a referência clara.
class GoogleMark extends StatelessWidget {
  const GoogleMark({super.key, this.size = 20});

  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: DecoratedBox(
        decoration: const BoxDecoration(
          color: Colors.white,
          shape: BoxShape.circle,
        ),
        child: Center(
          child: Text(
            'G',
            style: TextStyle(
              fontSize: size * 0.65,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF4285F4),
              height: 1,
            ),
          ),
        ),
      ),
    );
  }
}
