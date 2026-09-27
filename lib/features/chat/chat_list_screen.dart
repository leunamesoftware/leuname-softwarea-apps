import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../routes/route_paths.dart';
import '../auth/auth_providers.dart';
import '../products/product_providers.dart';
import 'chat_providers.dart';

class ChatListScreen extends ConsumerWidget {
  const ChatListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final chatsAsync = ref.watch(myChatsProvider);
    final myUid = ref.watch(currentUidProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Conversas')),
      body: chatsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) =>
            Center(child: Text('Não foi possível carregar. $error')),
        data: (chats) {
          if (chats.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.chat_bubble_outline,
                      size: 56,
                      color: Colors.grey,
                    ),
                    const SizedBox(height: 16),
                    Text('Nenhuma conversa ainda', style: AppTextStyles.h2),
                    const SizedBox(height: 8),
                    Text(
                      'Quando você conversar com um comprador ou vendedor,\naparece aqui.',
                      textAlign: TextAlign.center,
                      style: AppTextStyles.bodyRegular.copyWith(
                        color: Colors.grey.shade600,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }

          return ListView.separated(
            itemCount: chats.length,
            separatorBuilder: (_, _) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final chat = chats[index];
              final otherUid = chat.buyerId == myUid
                  ? chat.sellerId
                  : chat.buyerId;
              final productAsync = ref.watch(
                productDetailProvider(chat.productId),
              );
              final otherUserAsync = ref.watch(userProfileProvider(otherUid));

              return ListTile(
                onTap: () => context.push(RoutePaths.chatDetail(chat.id)),
                leading: const CircleAvatar(
                  backgroundColor: AppColors.surfaceMuted,
                  child: Icon(Icons.person, color: AppColors.primary),
                ),
                title: Text(
                  otherUserAsync.value?.name ?? 'Usuário',
                  style: AppTextStyles.bodyRegular.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                subtitle: Text(
                  productAsync.value?.title ?? chat.lastMessage,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTextStyles.caption,
                ),
                trailing: Text(
                  DateFormat.Hm().format(chat.lastMessageAt),
                  style: AppTextStyles.caption,
                ),
              );
            },
          );
        },
      ),
    );
  }
}
