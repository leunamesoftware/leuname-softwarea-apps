import 'dart:io';

import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final firebaseStorageProvider = Provider<FirebaseStorage>(
  (ref) => FirebaseStorage.instance,
);

/// Upload de arquivos para o Firebase Storage.
class StorageService {
  StorageService(this._storage);

  final FirebaseStorage _storage;

  Future<String> uploadChatImage({
    required String chatId,
    required File file,
  }) async {
    final path =
        'chat_images/$chatId/${DateTime.now().millisecondsSinceEpoch}.jpg';
    final ref = _storage.ref(path);
    await ref.putFile(file);
    return ref.getDownloadURL();
  }

  Future<String> uploadProductImage({
    required String sellerId,
    required File file,
    required int index,
  }) async {
    final path =
        'product_images/$sellerId/${DateTime.now().millisecondsSinceEpoch}_$index.jpg';
    final ref = _storage.ref(path);
    await ref.putFile(file);
    return ref.getDownloadURL();
  }
}

final storageServiceProvider = Provider<StorageService>((ref) {
  return StorageService(ref.watch(firebaseStorageProvider));
});
