import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mais1km/main.dart';

void main() {
  testWidgets('exibe tela de login e permite abrir cadastro', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: AppColors.forest),
        ),
        home: AuthScreen(
          api: _UnusedApiClient(),
          onAuthenticated: (_) {},
        ),
      ),
    );

    expect(find.text('Bem-vindo de volta'), findsOneWidget);
    expect(find.text('E-mail'), findsOneWidget);
    expect(find.text('Senha'), findsOneWidget);
    expect(find.text('Entrar'), findsOneWidget);

    await tester.tap(find.text('Cadastre-se'));
    await tester.pumpAndSettle();

    expect(find.text('Crie sua conta'), findsOneWidget);
    expect(find.text('Nome'), findsOneWidget);
    expect(find.text('Criar conta'), findsOneWidget);
  });
}

class _UnusedApiClient extends ApiClient {
  _UnusedApiClient();
}
