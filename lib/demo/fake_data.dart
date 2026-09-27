import '../core/constants/category_seed.dart';
import '../data/models/category_model.dart';
import '../data/models/chat_model.dart';
import '../data/models/message_model.dart';
import '../data/models/product_model.dart';
import '../data/models/product_status.dart';
import '../data/models/user_model.dart';
import '../data/models/user_role.dart';

/// Dados estáticos usados só na prévia visual (`flutter build web -t
/// lib/main_demo.dart`) — nenhuma chamada real a backend algum. Serve para
/// revisar telas e navegação antes de qualquer backend estar conectado.
abstract final class FakeData {
  static final UserModel me = UserModel(
    uid: 'demo-me',
    name: 'Emanuel Antunes',
    email: 'emanuel@leuname.com.br',
    phone: '+5521987654321',
    role: UserRole.user,
    adCredits: 5,
    createdAt: DateTime(2026, 9, 1),
  );

  static final UserModel seller = UserModel(
    uid: 'demo-seller',
    name: 'Carlos Silva',
    email: 'carlos@exemplo.com',
    role: UserRole.user,
    adCredits: 3,
    createdAt: DateTime(2026, 3, 10),
  );

  static List<CategoryModel> get categories => CategorySeed.initial;

  static final List<ProductModel> products = [
    ProductModel(
      id: 'demo-1',
      sellerId: seller.uid,
      title: 'iPhone 13 128GB',
      description:
          'iPhone 13 com 128GB de armazenamento, na cor azul. Produto original, '
          'lacrado, com garantia de 1 ano pela Apple.',
      price: 2499,
      imageUrls: const ['https://picsum.photos/seed/iphone13/800/800'],
      categoryId: 'eletronicos',
      condition: ProductCondition.novo,
      quantity: 1,
      status: ProductStatus.active,
      deliveryOption: DeliveryOption.deliversInRegion,
      state: 'RJ',
      city: 'Rio de Janeiro - RJ',
      region: 'Centro',
      createdAt: DateTime.now().subtract(const Duration(days: 5)),
      expiresAt: DateTime.now().add(const Duration(days: 35)),
    ),
    ProductModel(
      id: 'demo-2',
      sellerId: seller.uid,
      title: 'Sofá 3 lugares',
      description: 'Sofá em ótimo estado, tecido cinza, muito confortável.',
      price: 800,
      imageUrls: const ['https://picsum.photos/seed/sofa/800/800'],
      categoryId: 'moveis',
      condition: ProductCondition.usado,
      quantity: 1,
      status: ProductStatus.active,
      deliveryOption: DeliveryOption.pickupOnly,
      state: 'RJ',
      city: 'Rio de Janeiro - RJ',
      region: 'Tijuca',
      createdAt: DateTime.now().subtract(const Duration(days: 12)),
      expiresAt: DateTime.now().add(const Duration(days: 28)),
    ),
    ProductModel(
      id: 'demo-3',
      sellerId: me.uid,
      title: 'PlayStation 5',
      description: 'PS5 com 2 controles, pouco uso, com caixa e nota fiscal.',
      price: 2200,
      imageUrls: const ['https://picsum.photos/seed/ps5/800/800'],
      categoryId: 'games',
      condition: ProductCondition.usado,
      quantity: 1,
      status: ProductStatus.active,
      deliveryOption: DeliveryOption.pickupOnly,
      state: 'RJ',
      city: 'Rio de Janeiro - RJ',
      region: 'Vila Isabel',
      createdAt: DateTime.now().subtract(const Duration(days: 2)),
      expiresAt: DateTime.now().add(const Duration(days: 38)),
    ),
    ProductModel(
      id: 'demo-4',
      sellerId: seller.uid,
      title: 'Tênis Adidas',
      description: 'Tênis novo, número 42, nunca usado.',
      price: 349,
      imageUrls: const ['https://picsum.photos/seed/tenis/800/800'],
      categoryId: 'moda',
      condition: ProductCondition.novo,
      quantity: 2,
      status: ProductStatus.active,
      deliveryOption: DeliveryOption.deliversInRegion,
      state: 'RJ',
      city: 'Rio de Janeiro - RJ',
      region: 'Centro',
      createdAt: DateTime.now().subtract(const Duration(days: 1)),
      expiresAt: DateTime.now().add(const Duration(days: 39)),
    ),
  ];

  static final ChatModel chat = ChatModel(
    id: 'demo-chat-1',
    productId: 'demo-1',
    buyerId: me.uid,
    sellerId: seller.uid,
    lastMessage: 'Perfeito! Me passa o endereço.',
    lastMessageAt: DateTime.now().subtract(const Duration(minutes: 4)),
  );

  static final List<MessageModel> messages = [
    MessageModel(
      id: 'm1',
      chatId: chat.id,
      senderId: me.uid,
      text: 'Oi! Esse iPhone 13 ainda está disponível?',
      sentAt: DateTime.now().subtract(const Duration(minutes: 20)),
    ),
    MessageModel(
      id: 'm2',
      chatId: chat.id,
      senderId: seller.uid,
      text: 'Olá! Sim, ainda está disponível. É original, lacrado e com garantia.',
      sentAt: DateTime.now().subtract(const Duration(minutes: 18)),
    ),
    MessageModel(
      id: 'm3',
      chatId: chat.id,
      senderId: me.uid,
      text: 'Você consegue fazer por R\$ 2.300?',
      sentAt: DateTime.now().subtract(const Duration(minutes: 10)),
    ),
    MessageModel(
      id: 'm4',
      chatId: chat.id,
      senderId: seller.uid,
      text: 'Consigo sim, R\$ 2.300. Podemos combinar a entrega.',
      sentAt: DateTime.now().subtract(const Duration(minutes: 8)),
    ),
    MessageModel(
      id: 'm5',
      chatId: chat.id,
      senderId: me.uid,
      text: 'Perfeito! Me passa o endereço.',
      sentAt: DateTime.now().subtract(const Duration(minutes: 4)),
    ),
  ];
}
