import 'package:eclud/app.dart';
import 'package:eclud/data/models/partner.dart';
import 'package:eclud/data/repositories/partner_repository.dart';
import 'package:eclud/demo/demo_partner_repository.dart';
import 'package:eclud/features/location/location_providers.dart';
import 'package:eclud/features/partners/partner_providers.dart';
import 'package:eclud/core/config/app_config.dart';
import 'package:eclud/widgets/partner_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _InstantRepository implements PartnerRepository {
  @override
  Future<List<Partner>> fetchPartners() =>
      Future.value(DemoPartnerRepository.partners);
}

Widget _app() => ProviderScope(
  overrides: [
    partnerRepositoryProvider.overrideWithValue(_InstantRepository()),
    userLocationProvider.overrideWith((ref) async => AppConfig.defaultCenter),
  ],
  child: const EcludApp(),
);

void main() {
  testWidgets('onboarding leva à tela inicial com parceiros', (tester) async {
    await tester.binding.setSurfaceSize(const Size(400, 1200));
    await tester.pumpWidget(_app());
    await tester.pumpAndSettle();

    expect(find.text('Empezar ahora'), findsOneWidget);
    await tester.tap(find.text('Empezar ahora'));
    await tester.pumpAndSettle();

    expect(find.text('Más cercanos'), findsOneWidget);
    expect(find.byType(PartnerCard), findsWidgets);
  });

  testWidgets('filtro de categoria mostra só a categoria escolhida', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(400, 3000));
    await tester.pumpWidget(_app());
    await tester.pumpAndSettle();
    await tester.tap(find.text('Empezar ahora'));
    await tester.pumpAndSettle();

    // A fonte de teste é larga: rola a lista de filtros até o chip.
    await tester.dragUntilVisible(
      find.text('Belleza'),
      find.byType(ListView).first,
      const Offset(-200, 0),
    );
    await tester.tap(find.text('Belleza'));
    await tester.pumpAndSettle();

    expect(find.text('Barbería Elite'), findsOneWidget);
    expect(find.text('Estética Luna'), findsOneWidget);
    expect(find.text('Coffee Time'), findsNothing);
  });

  testWidgets('busca ignora acentos', (tester) async {
    await tester.binding.setSurfaceSize(const Size(400, 3000));
    await tester.pumpWidget(_app());
    await tester.pumpAndSettle();
    await tester.tap(find.text('Empezar ahora'));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), 'estetica');
    await tester.pumpAndSettle();

    expect(find.text('Estética Luna'), findsOneWidget);
    expect(find.byType(PartnerCard), findsOneWidget);
  });
}
