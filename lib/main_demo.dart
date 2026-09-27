import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'data/models/credit_transaction_model.dart';
import 'demo/demo_app.dart';
import 'demo/fake_data.dart';
import 'demo/fake_repositories.dart';
import 'features/auth/auth_providers.dart';
import 'features/categories/category_providers.dart';
import 'features/chat/chat_providers.dart';
import 'features/credits/credit_providers.dart';
import 'features/products/product_providers.dart';

/// Ponto de entrada da prévia visual (sem backend real). Rodar/compilar com:
///   flutter build web -t lib/main_demo.dart
///
/// Só existe pra revisão de design/navegação antes do backend (Cloudflare)
/// estar pronto — não usar como referência de comportamento real de dados.
void main() {
  final fakeProducts = FakeProductRepository();
  final fakeChats = FakeChatRepository();
  final fakeAuth = FakeAuthRepository();

  runApp(
    ProviderScope(
      overrides: [
        productRepositoryProvider.overrideWithValue(fakeProducts),
        chatRepositoryProvider.overrideWithValue(fakeChats),
        authRepositoryProvider.overrideWithValue(fakeAuth),
        currentUidProvider.overrideWithValue(FakeData.me.uid),
        categoriesProvider.overrideWith(
          (ref) => Stream.value(FakeData.categories),
        ),
        currentUserProfileProvider.overrideWith(
          (ref) => Stream.value(FakeData.me),
        ),
        userProfileProvider.overrideWith(
          (ref, uid) => Future.value(
            uid == FakeData.seller.uid ? FakeData.seller : FakeData.me,
          ),
        ),
        creditHistoryProvider.overrideWith(
          (ref) => Stream.value(<CreditTransactionModel>[]),
        ),
      ],
      child: const LeuPlaceDemoApp(),
    ),
  );
}
