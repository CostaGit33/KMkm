import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mais1km/core/api/api_client.dart';
import 'package:mais1km/features/auth/password_reset_page.dart';

void main() {
  testWidgets('valida comprimento e confirmação antes de enviar', (tester) async {
    final api = ApiClient(
      sessionCookieReader: () async => null,
      sessionCookieClearer: () async {},
    );
    addTearDown(api.dispose);

    await tester.pumpWidget(
      MaterialApp(
        home: PasswordResetPage(
          api: api,
          token: 'token-de-teste-nao-utilizado',
          onSuccess: () {},
        ),
      ),
    );

    expect(find.text('Crie uma nova senha'), findsOneWidget);
    await tester.tap(find.text('Salvar nova senha'));
    await tester.pumpAndSettle();
    expect(find.text('Use de 8 a 128 caracteres.'), findsOneWidget);

    await tester.enterText(find.byType(TextFormField).at(0), 'senha-segura-123');
    await tester.enterText(find.byType(TextFormField).at(1), 'senha-diferente');
    await tester.tap(find.text('Salvar nova senha'));
    await tester.pumpAndSettle();
    expect(find.text('As senhas não coincidem.'), findsOneWidget);
  });
}
