import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';

import '../../core/services/storage_service.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/utils/contact_filter.dart';
import '../../routes/route_paths.dart';
import '../auth/auth_providers.dart';
import '../products/product_providers.dart';
import 'chat_providers.dart';

class ChatDetailScreen extends ConsumerStatefulWidget {
  const ChatDetailScreen({super.key, required this.chatId});

  final String chatId;

  @override
  ConsumerState<ChatDetailScreen> createState() => _ChatDetailScreenState();
}

class _ChatDetailScreenState extends ConsumerState<ChatDetailScreen> {
  final _controller = TextEditingController();
  bool _sendingImage = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _sendPhoto() async {
    final picked = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      imageQuality: 80,
    );
    if (picked == null) return;

    final myUid = ref.read(currentUidProvider);
    if (myUid == null) return;

    setState(() => _sendingImage = true);
    try {
      final url = await ref
          .read(storageServiceProvider)
          .uploadChatImage(chatId: widget.chatId, file: File(picked.path));
      await ref
          .read(chatRepositoryProvider)
          .sendMessage(chatId: widget.chatId, senderId: myUid, imageUrl: url);
    } finally {
      if (mounted) setState(() => _sendingImage = false);
    }
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty) return;

    if (ContactFilter.containsExternalContact(text)) {
      showDialog(
        context: context,
        builder: (_) => AlertDialog(
          title: const Text('Combine tudo por aqui'),
          content: const Text(
            'Por segurança, o LeuPlace não permite compartilhar telefone, '
            'WhatsApp ou redes sociais no chat. Continue a negociação por aqui — '
            'é mais seguro para você e para o outro lado.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Entendi'),
            ),
          ],
        ),
      );
      return;
    }

    final myUid = ref.read(currentUidProvider);
    if (myUid == null) return;

    _controller.clear();
    await ref
        .read(chatRepositoryProvider)
        .sendMessage(chatId: widget.chatId, senderId: myUid, text: text);
  }

  @override
  Widget build(BuildContext context) {
    final chatAsync = ref.watch(chatDetailProvider(widget.chatId));
    final messagesAsync = ref.watch(chatMessagesProvider(widget.chatId));
    final myUid = ref.watch(currentUidProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Conversa')),
      body: Column(
        children: [
          chatAsync.when(
            loading: () => const SizedBox.shrink(),
            error: (_, _) => const SizedBox.shrink(),
            data: (chat) {
              if (chat == null) return const SizedBox.shrink();
              final otherUid = chat.buyerId == myUid
                  ? chat.sellerId
                  : chat.buyerId;
              return Column(
                children: [
                  Consumer(
                    builder: (context, ref, _) {
                      final other = ref
                          .watch(userProfileProvider(otherUid))
                          .value;
                      return ListTile(
                        leading: const CircleAvatar(
                          backgroundColor: AppColors.surfaceMuted,
                          child: Icon(Icons.person, color: AppColors.primary),
                        ),
                        title: Text(
                          other?.name ?? 'Usuário',
                          style: AppTextStyles.bodyRegular.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      );
                    },
                  ),
                  Consumer(
                    builder: (context, ref, _) {
                      final product = ref
                          .watch(productDetailProvider(chat.productId))
                          .value;
                      if (product == null) return const SizedBox.shrink();
                      return Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: InkWell(
                          onTap: () => context.push(
                            RoutePaths.productDetail(product.id),
                          ),
                          child: Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              border: Border.all(color: Colors.grey.shade200),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              children: [
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(8),
                                  child: SizedBox(
                                    width: 48,
                                    height: 48,
                                    child: product.imageUrls.isNotEmpty
                                        ? Image.network(
                                            product.imageUrls.first,
                                            fit: BoxFit.cover,
                                          )
                                        : Container(
                                            color: AppColors.surfaceMuted,
                                          ),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        product.title,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: AppTextStyles.bodyRegular
                                            .copyWith(
                                              fontWeight: FontWeight.w600,
                                            ),
                                      ),
                                      Text(
                                        'R\$ ${product.price.toStringAsFixed(2)}',
                                        style: AppTextStyles.caption.copyWith(
                                          color: AppColors.primary,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const Icon(
                                  Icons.chevron_right,
                                  color: Colors.grey,
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                  const Divider(height: 20),
                ],
              );
            },
          ),
          Expanded(
            child: messagesAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) =>
                  Center(child: Text('Erro ao carregar mensagens. $error')),
              data: (messages) {
                if (messages.isEmpty) {
                  return Center(
                    child: Text(
                      'Envie a primeira mensagem.',
                      style: AppTextStyles.bodyRegular.copyWith(
                        color: Colors.grey.shade500,
                      ),
                    ),
                  );
                }
                return ListView.builder(
                  reverse: true,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  itemCount: messages.length,
                  itemBuilder: (context, index) {
                    final message = messages[index];
                    final isMine = message.senderId == myUid;
                    return Align(
                      alignment: isMine
                          ? Alignment.centerRight
                          : Alignment.centerLeft,
                      child: Container(
                        margin: const EdgeInsets.symmetric(vertical: 4),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 10,
                        ),
                        constraints: BoxConstraints(
                          maxWidth: MediaQuery.of(context).size.width * 0.72,
                        ),
                        decoration: BoxDecoration(
                          color: isMine
                              ? AppColors.primary
                              : AppColors.surfaceMuted,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (message.isImage)
                              ClipRRect(
                                borderRadius: BorderRadius.circular(10),
                                child: Image.network(
                                  message.imageUrl!,
                                  width: 200,
                                  fit: BoxFit.cover,
                                ),
                              )
                            else
                              Text(
                                message.text,
                                style: AppTextStyles.bodyRegular.copyWith(
                                  color: isMine
                                      ? Colors.white
                                      : AppColors.textDark,
                                ),
                              ),
                            const SizedBox(height: 4),
                            Text(
                              DateFormat.Hm().format(message.sentAt),
                              style: AppTextStyles.caption.copyWith(
                                color: isMine
                                    ? Colors.white70
                                    : Colors.grey.shade500,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  IconButton(
                    onPressed: _sendingImage ? null : _sendPhoto,
                    icon: _sendingImage
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.attach_file, color: Colors.grey),
                  ),
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _send(),
                      decoration: const InputDecoration(
                        hintText: 'Digite uma mensagem...',
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: _send,
                    style: IconButton.styleFrom(
                      backgroundColor: AppColors.primary,
                    ),
                    icon: const Icon(Icons.send, color: Colors.white),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
