import 'package:flutter/material.dart';

import '../../widgets/coming_soon_view.dart';

class SearchScreen extends StatelessWidget {
  const SearchScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Buscar')),
      body: const ComingSoonView(
        icon: Icons.search,
        title: 'Busca por região e categoria',
        phase: 'Fase 4 — Categorias e pesquisa',
      ),
    );
  }
}
