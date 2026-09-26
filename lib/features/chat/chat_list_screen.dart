import 'package:flutter/material.dart';

import '../../widgets/coming_soon_view.dart';

class ChatListScreen extends StatelessWidget {
  const ChatListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Conversas')),
      body: const ComingSoonView(
        icon: Icons.chat_bubble_outline,
        title: 'Chat e negociação',
        phase: 'Fase 7 — Chat e negociação',
      ),
    );
  }
}
