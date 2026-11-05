import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mais1km/core/api/api_client.dart';
import 'package:mais1km/features/auth/password_reset_page.dart';

void main() {
  testWidgets('impede envio quando a confirmação da senha não coincide', (tester) async {
    var completed = false;
    final api = ApiClient(baseUrl: 'https://api.test');
    addTearDown(api.dispose);

    await tester.pumpWidget(MaterialApp(
      home: PasswordResetPage(
        api: api,
        token: 'token-de-teste-comprido-12345678901234567890',
        onCompleted: () => completed = true,
      ),
    ));

    final fields = find.byType(TextFormField);
    await tester.enterText(fields.at(0), 'senha-nova-segura');
    await tester.enterText(fields.at(1), 'senha-diferente');
    await tester.ensureVisible(find.text('Salvar nova senha'));
    await tester.tap(find.text('Salvar nova senha'));
    await tester.pumpAndSettle();

    expect(find.text('As senhas não coincidem.'), findsOneWidget);
    expect(completed, isFalse);
  });

  testWidgets('valida comprimento mínimo antes de enviar', (tester) async {
    final api = ApiClient(baseUrl: 'https://api.test');
    addTearDown(api.dispose);

    await tester.pumpWidget(MaterialApp(
      home: PasswordResetPage(
        api: api,
        token: 'token-de-teste-comprido-12345678901234567890',
        onCompleted: () {},
      ),
    ));

    final fields = find.byType(TextFormField);
    await tester.enterText(fields.at(0), 'curta');
    await tester.enterText(fields.at(1), 'curta');
    await tester.ensureVisible(find.text('Salvar nova senha'));
    await tester.tap(find.text('Salvar nova senha'));
    await tester.pumpAndSettle();

    expect(find.text('Use pelo menos 8 caracteres.'), findsOneWidget);
  });
}
