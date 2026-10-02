import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import 'token_store.dart';

/// Erro devolvido pela API, com o código fixo que o app traduz.
class ApiException implements Exception {
  const ApiException(this.statusCode, this.code, [this.data = const {}]);

  final int statusCode;
  final String code;
  final Map<String, dynamic> data;

  bool get isNetwork => statusCode == 0;

  @override
  String toString() => 'ApiException($statusCode, $code)';
}

/// Cliente HTTP da API do Eclud: JSON, token e erros num só lugar.
class ApiClient {
  ApiClient({
    required this.baseUrl,
    required this.tokens,
    http.Client? client,
    this.onUnauthorized,
  }) : _http = client ?? http.Client();

  final String baseUrl;
  final TokenStore tokens;
  final http.Client _http;

  /// Chamado quando a sessão expira (401), para levar ao login.
  void Function()? onUnauthorized;

  static const _timeout = Duration(seconds: 15);

  Future<dynamic> get(String path) => _send('GET', path);
  Future<dynamic> post(String path, [Object? body]) =>
      _send('POST', path, body);
  Future<dynamic> put(String path, [Object? body]) => _send('PUT', path, body);
  Future<dynamic> patch(String path, [Object? body]) =>
      _send('PATCH', path, body);
  Future<dynamic> delete(String path) => _send('DELETE', path);

  Future<dynamic> _send(String method, String path, [Object? body]) async {
    final request = http.Request(method, Uri.parse('$baseUrl$path'));
    request.headers['Accept'] = 'application/json';
    final token = await tokens.read();
    if (token != null) request.headers['Authorization'] = 'Bearer $token';
    if (body != null) {
      request.headers['Content-Type'] = 'application/json';
      request.body = jsonEncode(body);
    }

    final http.Response response;
    try {
      response = await http.Response.fromStream(
        await _http.send(request).timeout(_timeout),
      );
    } on TimeoutException {
      throw const ApiException(0, 'network');
    } on http.ClientException {
      throw const ApiException(0, 'network');
    }

    final decoded = response.body.isEmpty ? null : _decode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return decoded;
    }
    final data = decoded is Map<String, dynamic>
        ? decoded
        : <String, dynamic>{};
    if (response.statusCode == 401 && token != null) onUnauthorized?.call();
    throw ApiException(
      response.statusCode,
      data['error'] as String? ?? 'server_error',
      data,
    );
  }

  static dynamic _decode(String body) {
    try {
      return jsonDecode(body);
    } on FormatException {
      return null;
    }
  }
}
