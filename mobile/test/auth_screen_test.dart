import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mais1km/core/api/api_client.dart';
import 'package:mais1km/main.dart';

void main() {
  testWidgets(
    'exibe saudação neutra para primeira visita e permite alternar para cadastro',
    (tester) async {
      final api = ApiClient();
      addTearDown(api.dispose);
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData(
            colorScheme: ColorScheme.fromSeed(seedColor: AppColors.forest),
          ),
          home: AuthScreen(api: api, onAuthenticated: (_) {}),
        ),
      );

      expect(find.text('Acesse sua conta'), findsOneWidget);
      expect(find.text('Bem-vindo de volta'), findsNothing);
      expect(
        find.text('Entre com seus dados ou cadastre-se para começar sua jornada pelo +1 KM.'),
        findsOneWidget,
      );
      expect(find.text('E-mail'), findsOneWidget);
      expect(find.text('Senha'), findsOneWidget);
      expect(find.text('Entrar'), findsOneWidget);

      await tester.ensureVisible(find.text('Cadastre-se'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Cadastre-se'));
      await tester.pumpAndSettle();

      expect(find.text('Crie sua conta'), findsOneWidget);
      expect(find.text('Nome'), findsOneWidget);
      expect(find.text('Criar conta'), findsOneWidget);
    },
  );

  testWidgets(
    'explica que a TAG ficará pendente até login ou cadastro',
    (tester) async {
      final api = ApiClient();
      addTearDown(api.dispose);
      await tester.pumpWidget(
        MaterialApp(
          home: AuthScreen(
            api: api,
            onAuthenticated: (_) {},
            hasPendingStamp: true,
          ),
        ),
      );

      expect(
        find.text('Entre ou crie sua conta para validar o carimbo desta TAG.'),
        findsOneWidget,
      );
      expect(find.text('Bem-vindo de volta'), findsNothing);
    },
  );
}
