import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mais1km/core/api/api_client.dart';
import 'package:mais1km/features/stamp/stamp_page.dart';

void main() {
  testWidgets('reconhece o App Link inicial e não pede GPS automaticamente',
      (tester) async {
    final api = ApiClient(sessionCookieReader: () async => null);
    addTearDown(api.dispose);

    await tester.pumpWidget(
      MaterialApp(
        home: StampPage(
          api: api,
          initialUri: Uri.parse(
            'https://mais1km.novaagencian8n.online/t/ponto-123?k=segredo',
          ),
        ),
      ),
    );

    expect(find.text('Conquistar carimbo'), findsOneWidget);
    // A mensagem fica abaixo do conteúdo inicial da ListView. Role até ela
    // para que o teste valide a interface renderizada, não apenas widgets
    // que ainda estão fora da área construída pelo viewport.
    await tester.scrollUntilVisible(
      find.text('Link reconhecido. Toque em “Enviar carimbo” para continuar.'),
      250,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Link reconhecido. Toque em “Enviar carimbo” para continuar.'),
        findsOneWidget);
    expect(find.text('Enviar carimbo'), findsOneWidget);
    expect(find.text('Permitir GPS e tentar novamente'), findsNothing);
  });

  testWidgets('não aceita deep link de domínio diferente', (tester) async {
    final api = ApiClient(sessionCookieReader: () async => null);
    addTearDown(api.dispose);

    await tester.pumpWidget(
      MaterialApp(
        home: StampPage(
          api: api,
          initialUri: Uri.parse('https://example.com/t/ponto-123?k=segredo'),
        ),
      ),
    );

    expect(find.text('Link reconhecido. Toque em “Enviar carimbo” para continuar.'),
        findsNothing);
    expect(find.text('Link Mais1km pronto para validação.'), findsNothing);
  });
}
