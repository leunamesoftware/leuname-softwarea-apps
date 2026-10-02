import 'package:eclud/features/merchant/merchant_panel_screen.dart';
import 'package:eclud/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _panel() => ProviderScope(
  child: MaterialApp(
    locale: const Locale('es'),
    localizationsDelegates: AppLocalizations.localizationsDelegates,
    supportedLocales: AppLocalizations.supportedLocales,
    home: const MerchantPanelScreen(),
  ),
);

void main() {
  testWidgets('mostra resumo do mês e troca de aba', (tester) async {
    await tester.binding.setSurfaceSize(const Size(700, 1600));
    await tester.pumpWidget(_panel());
    await tester.pumpAndSettle();

    expect(find.text('Cupones validados'), findsOneWidget);
    expect(find.text('Validaciones · últimos 30 días'), findsOneWidget);

    await tester.tap(find.text('Cupones'));
    await tester.pumpAndSettle();
    expect(find.text('Últimos cupones validados'), findsOneWidget);
  });

  testWidgets('ajustes recusam PIN e desconto inválidos', (tester) async {
    await tester.binding.setSurfaceSize(const Size(700, 1600));
    await tester.pumpWidget(_panel());
    await tester.pumpAndSettle();
    await tester.tap(find.text('Ajustes'));
    await tester.pumpAndSettle();

    await tester.enterText(
      find.widgetWithText(TextFormField, 'Porcentaje de descuento'),
      '90',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Nuevo PIN (4 dígitos)'),
      '12',
    );
    await tester.tap(find.text('Guardar cambios'));
    await tester.pumpAndSettle();

    expect(find.text('Elige un descuento entre 5% y 50%.'), findsOneWidget);
    expect(find.text('El PIN debe tener 4 dígitos.'), findsOneWidget);
  });
}
