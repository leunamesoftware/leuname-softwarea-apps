import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:leuplace/widgets/app_logo.dart';

void main() {
  testWidgets('AppLogo mostra o wordmark e a tagline', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const MaterialApp(home: Scaffold(body: AppLogo())));

    expect(find.byType(AppLogo), findsOneWidget);
    expect(find.text('Compra • Venda • Encontre'), findsOneWidget);
  });
}
