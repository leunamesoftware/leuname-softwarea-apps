import 'package:eclud/data/models/app_user.dart';
import 'package:eclud/routes/app_router.dart';
import 'package:eclud/routes/route_paths.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

const _member = AppUser(
  id: '1',
  name: 'Lucía Pérez',
  email: 'lucia@test.es',
  role: UserRole.member,
);
const _merchant = AppUser(
  id: '2',
  name: 'Bella',
  email: 'comercio@test.es',
  role: UserRole.merchant,
  merchantId: 'p1',
);

String? _redirect(AppUser? user, String location) => authRedirect(
  session: AsyncData(user),
  location: Uri.parse(location).path,
  uri: Uri.parse(location),
);

void main() {
  group('authRedirect', () {
    test('visitante explora parceiros sem conta', () {
      expect(_redirect(null, RoutePaths.home), isNull);
      expect(_redirect(null, RoutePaths.partner('p1')), isNull);
    });

    test('usar desconto sem conta leva ao login e guarda o destino', () {
      final target = _redirect(null, RoutePaths.redeem('p1'))!;
      final uri = Uri.parse(target);
      expect(uri.path, RoutePaths.login);
      expect(uri.queryParameters['next'], RoutePaths.redeem('p1'));
    });

    test('depois do login volta ao destino guardado', () {
      final next = Uri.encodeComponent(RoutePaths.redeem('p1'));
      expect(
        _redirect(_member, '${RoutePaths.login}?next=$next'),
        RoutePaths.redeem('p1'),
      );
    });

    test('ignora destino externo (redirecionamento aberto)', () {
      expect(
        _redirect(_member, '${RoutePaths.login}?next=//malicioso.com'),
        RoutePaths.home,
      );
    });

    test('painel só para lojista', () {
      expect(_redirect(null, RoutePaths.merchant), RoutePaths.login);
      expect(_redirect(_member, RoutePaths.merchant), RoutePaths.home);
      expect(_redirect(_merchant, RoutePaths.merchant), isNull);
    });
  });

  test('AppUser lê assinatura e primeiro nome da API', () {
    final user = AppUser.fromJson({
      'id': '1',
      'name': 'Lucía Pérez',
      'email': 'lucia@test.es',
      'role': 'member',
      'subscription': {
        'status': 'active',
        'currentPeriodEnd': DateTime.now()
            .add(const Duration(days: 3))
            .toIso8601String(),
      },
      'merchantId': null,
    });
    expect(user.firstName, 'Lucía');
    expect(user.subscriptionActive, isTrue);
    expect(user.isMerchant, isFalse);
  });
}
