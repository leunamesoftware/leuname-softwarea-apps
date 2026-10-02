import 'dart:convert';

import 'package:eclud/data/api/api_client.dart';
import 'package:eclud/data/api/api_redemption_repository.dart';
import 'package:eclud/data/api/token_store.dart';
import 'package:eclud/data/models/redemption.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

class _MemoryTokens extends TokenStore {
  String? token;
  @override
  Future<String?> read() async => token;
  @override
  Future<void> write(String value) async => token = value;
  @override
  Future<void> clear() async => token = null;
}

ApiClient _client(http.Response Function(http.Request) handler) => ApiClient(
  baseUrl: 'https://api.test',
  tokens: _MemoryTokens()..token = 'abc',
  client: MockClient((r) async => handler(r)),
);

http.Response _json(int status, Object body) => http.Response(
  jsonEncode(body),
  status,
  headers: {'content-type': 'application/json'},
);

void main() {
  test('envia o token e converte erro em ApiException', () async {
    late http.Request sent;
    final api = _client((r) {
      sent = r;
      return _json(409, {'error': 'email_taken'});
    });
    await expectLater(
      api.post('/auth/register', {'a': 1}),
      throwsA(isA<ApiException>().having((e) => e.code, 'code', 'email_taken')),
    );
    expect(sent.headers['Authorization'], 'Bearer abc');
  });

  test('401 com sessão avisa que expirou', () async {
    var expired = false;
    final api = _client((_) => _json(401, {'error': 'unauthorized'}))
      ..onUnauthorized = () => expired = true;
    await expectLater(api.get('/me'), throwsA(isA<ApiException>()));
    expect(expired, isTrue);
  });

  test('resgate traduz as respostas do servidor', () async {
    Future<RedemptionResult> redeemWith(http.Response response) =>
        ApiRedemptionRepository(_client((_) => response))
            .redeem(partnerId: 'p1', pin: '1234');

    expect(
      await redeemWith(
        _json(201, {
          'code': 'K7M2QX',
          'merchantId': 'p1',
          'discountPercent': 15,
          'redeemedAt': '2026-10-02T10:00:00.000Z',
        }),
      ),
      isA<RedemptionSuccess>(),
    );
    final wrong = await redeemWith(
      _json(403, {'error': 'wrong_pin', 'remainingAttempts': 3}),
    );
    expect((wrong as RedemptionWrongPin).remainingAttempts, 3);
    expect(
      await redeemWith(_json(429, {'error': 'pin_locked'})),
      isA<RedemptionLocked>(),
    );
    expect(
      await redeemWith(_json(402, {'error': 'subscription_required'})),
      isA<RedemptionSubscriptionRequired>(),
    );
  });
}
