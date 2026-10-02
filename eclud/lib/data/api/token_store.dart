import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Guarda o token de sessão no cofre do sistema (Keychain no iOS,
/// Keystore no Android, armazenamento cifrado no navegador).
class TokenStore {
  TokenStore([FlutterSecureStorage? storage])
    : _storage = storage ?? const FlutterSecureStorage();

  static const _key = 'eclud_session';

  final FlutterSecureStorage _storage;
  String? _cache;
  bool _loaded = false;

  Future<String?> read() async {
    if (!_loaded) {
      _cache = await _storage.read(key: _key);
      _loaded = true;
    }
    return _cache;
  }

  Future<void> write(String token) async {
    _cache = token;
    _loaded = true;
    await _storage.write(key: _key, value: token);
  }

  Future<void> clear() async {
    _cache = null;
    _loaded = true;
    await _storage.delete(key: _key);
  }
}
