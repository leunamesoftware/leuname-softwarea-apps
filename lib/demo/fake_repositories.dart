import 'package:firebase_auth/firebase_auth.dart';

import '../data/models/chat_model.dart';
import '../data/models/message_model.dart';
import '../data/models/product_model.dart';
import '../data/repositories/auth_repository.dart';
import '../data/repositories/chat_repository.dart';
import '../data/repositories/product_repository.dart';
import 'fake_data.dart';

/// Implementações sem backend real, usadas só na prévia de demonstração —
/// `implements` (não `extends`) para nunca precisar construir um datasource
/// de verdade nem tocar no Firebase.
class FakeProductRepository implements ProductRepository {
  final List<ProductModel> _products = List.of(FakeData.products);

  @override
  Stream<List<ProductModel>> watchActiveProducts() => Stream.value(_products);

  @override
  Stream<List<ProductModel>> watchByCategory(String categoryId) {
    return Stream.value(
      _products.where((p) => p.categoryId == categoryId).toList(),
    );
  }

  @override
  Future<void> publish(ProductModel product) async {
    _products.insert(0, product);
  }

  @override
  Stream<ProductModel?> watchById(String id) {
    for (final product in _products) {
      if (product.id == id) return Stream.value(product);
    }
    return Stream.value(null);
  }

  @override
  Stream<List<ProductModel>> watchMyProducts(String sellerId) {
    return Stream.value(
      _products.where((p) => p.sellerId == sellerId).toList(),
    );
  }

  @override
  Future<void> pause(String productId) async {}

  @override
  Future<void> activate(String productId) async {}

  @override
  Future<void> delete(String productId) async {
    _products.removeWhere((p) => p.id == productId);
  }

  @override
  Stream<List<ProductModel>> searchByTitle(String query) {
    if (query.trim().isEmpty) return watchActiveProducts();
    final lower = query.toLowerCase();
    return Stream.value(
      _products.where((p) => p.title.toLowerCase().contains(lower)).toList(),
    );
  }
}

class FakeChatRepository implements ChatRepository {
  @override
  Stream<List<ChatModel>> watchChatsForUser(String uid) =>
      Stream.value([FakeData.chat]);

  @override
  Stream<ChatModel?> watchChat(String chatId) => Stream.value(FakeData.chat);

  @override
  Future<String> findOrCreateChat({
    required String productId,
    required String buyerId,
    required String sellerId,
  }) async {
    return FakeData.chat.id;
  }

  @override
  Stream<List<MessageModel>> watchMessages(String chatId) {
    final sorted = List.of(FakeData.messages)
      ..sort((a, b) => b.sentAt.compareTo(a.sentAt));
    return Stream.value(sorted);
  }

  @override
  Future<void> sendMessage({
    required String chatId,
    required String senderId,
    String text = '',
    String? imageUrl,
  }) async {
    FakeData.messages.add(
      MessageModel(
        id: 'm${FakeData.messages.length + 1}',
        chatId: chatId,
        senderId: senderId,
        text: text,
        imageUrl: imageUrl,
        sentAt: DateTime.now(),
      ),
    );
  }
}

class FakeAuthRepository implements AuthRepository {
  @override
  Stream<User?> get authStateChanges => Stream.value(null);

  @override
  User? get currentUser => null;

  @override
  Future<void> signUpWithEmail({
    required String name,
    required String email,
    required String password,
    String? phone,
  }) async {}

  @override
  Future<void> signInWithEmail({
    required String email,
    required String password,
  }) async {}

  @override
  Future<void> signInWithGoogle() async {}

  @override
  Future<void> sendPhoneVerificationCode({
    required String phoneNumber,
    required void Function(String verificationId) onCodeSent,
  }) async {}

  @override
  Future<void> confirmPhoneCode({
    required String verificationId,
    required String smsCode,
  }) async {}

  @override
  Future<void> signOut() async {}
}
