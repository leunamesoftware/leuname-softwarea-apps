import 'package:flutter/material.dart';

import '../../widgets/coming_soon_view.dart';

class CreateProductScreen extends StatelessWidget {
  const CreateProductScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Anunciar')),
      body: const ComingSoonView(
        icon: Icons.add_box_outlined,
        title: 'Criação de anúncios',
        phase: 'Fase 5 — Anúncios',
      ),
    );
  }
}
