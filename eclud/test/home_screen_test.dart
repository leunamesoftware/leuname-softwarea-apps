import 'package:eclud/app.dart';
import 'package:eclud/data/models/partner.dart';
import 'package:eclud/demo/demo_partner_repository.dart';
import 'package:eclud/features/location/location_providers.dart';
import 'package:eclud/features/partners/partner_providers.dart';
import 'package:eclud/core/config/app_config.dart';
import 'package:eclud/widgets/partner_card.dart';
import 'package:eclud/widgets/primary_button.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _InstantRepository extends DemoPartnerRepository {
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
  setUp(() => SharedPreferences.setMockInitialValues({}));

  testWidgets('onboarding leva à tela inicial com parceiros', (tester) async {
    await tester.binding.setSurfaceSize(const Size(400, 1200));
    await tester.pumpWidget(_app());
    await tester.pumpAndSettle();

    expect(find.text('Empezar ahora'), findsOneWidget);
    await tester.tap(find.text('Ver descuentos sin registrarme'));
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
    await tester.tap(find.text('Ver descuentos sin registrarme'));
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
    await tester.tap(find.text('Ver descuentos sin registrarme'));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), 'estetica');
    await tester.pumpAndSettle();

    expect(find.text('Estética Luna'), findsOneWidget);
    expect(find.byType(PartnerCard), findsOneWidget);
  });

  testWidgets('detalhe → PIN → cupom ativo', (tester) async {
    await tester.binding.setSurfaceSize(const Size(500, 1400));
    await tester.pumpWidget(_app());
    await tester.pumpAndSettle();
    await tester.tap(find.text('Ver descuentos sin registrarme'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('La Bella Cucina'));
    await tester.pumpAndSettle();
    expect(find.text('Condiciones del descuento'), findsOneWidget);

    // Visitante: usar desconto pede login e depois volta ao PIN.
    await tester.tap(find.text('Canjear descuento'));
    await tester.pumpAndSettle();
    expect(find.text('Inicia sesión'), findsWidgets);
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Correo electrónico'),
      'lucia@demo.es',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Contraseña'),
      'contraseña',
    );
    await tester.tap(find.widgetWithText(PrimaryButton, 'Inicia sesión'));
    await tester.pumpAndSettle();
    expect(find.text('La Bella Cucina'), findsOneWidget);

    Future<void> typePin() async {
      for (final d in ['1', '2', '3', '4']) {
        await tester.tap(find.text(d));
        await tester.pump();
      }
      await tester.pump(const Duration(seconds: 1));
      await tester.pump();
    }

    // Sem assinatura o desconto não é liberado: assina e tenta de novo.
    await typePin();
    expect(
      find.text('Necesitas una suscripción activa para usar descuentos.'),
      findsOneWidget,
    );
    await tester.tap(find.widgetWithText(PrimaryButton, 'Suscribirme'));
    await tester.pumpAndSettle();
    await tester.tap(find.textContaining('Suscribirme por'));
    await tester.pump(const Duration(seconds: 1));
    await tester.pumpAndSettle();

    await typePin();

    expect(find.text('¡CUPÓN ACTIVO!'), findsOneWidget);
    // O relógio da tela de cupom roda sem parar; sai para encerrar o teste.
    await tester.tap(find.text('Volver al inicio'));
    await tester.pumpAndSettle();
    expect(find.text('Más cercanos'), findsOneWidget);
  });

  testWidgets('ordenar por maior desconto põe 20% primeiro', (tester) async {
    await tester.binding.setSurfaceSize(const Size(400, 3000));
    await tester.pumpWidget(_app());
    await tester.pumpAndSettle();
    await tester.tap(find.text('Ver descuentos sin registrarme'));
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('Ordenar'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Mayor descuento').last);
    await tester.pumpAndSettle();

    final first = tester.widget<PartnerCard>(find.byType(PartnerCard).first);
    expect(first.item.partner.discountPercent, 20);
  });

  testWidgets('favoritar no detalhe aparece em Mis favoritos', (tester) async {
    await tester.binding.setSurfaceSize(const Size(500, 1400));
    await tester.pumpWidget(_app());
    await tester.pumpAndSettle();
    await tester.tap(find.text('Ver descuentos sin registrarme'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Coffee Time'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Añadir a favoritos'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Volver'));
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('Mis favoritos'));
    await tester.pumpAndSettle();
    expect(find.byType(PartnerCard), findsOneWidget);
    expect(find.text('Coffee Time'), findsOneWidget);
  });

  testWidgets('recuperar senha com o código enviado por e-mail', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(500, 1400));
    await tester.pumpWidget(_app());
    await tester.pumpAndSettle();
    await tester.tap(find.text('Inicia sesión'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('¿Olvidaste tu contraseña?'));
    await tester.pumpAndSettle();

    await tester.enterText(
      find.widgetWithText(TextFormField, 'Correo electrónico'),
      'lucia@demo.es',
    );
    await tester.tap(find.widgetWithText(PrimaryButton, 'Enviar código'));
    await tester.pumpAndSettle();

    await tester.enterText(
      find.widgetWithText(TextFormField, 'Código de 6 dígitos'),
      '123456',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Contraseña'),
      'nueva-clave-1',
    );
    await tester.tap(find.widgetWithText(PrimaryButton, 'Guardar y entrar'));
    await tester.pumpAndSettle();

    expect(find.text('¡Hola, Lucía!'), findsOneWidget);
  });
}
