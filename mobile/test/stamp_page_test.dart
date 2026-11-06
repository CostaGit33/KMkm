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

  testWidgets('mostra distância real e raio permitido quando está fora do geofence',
      (tester) async {
    final api = _OutsideRadiusApi();
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

    await tester.scrollUntilVisible(
      find.text('Enviar carimbo'),
      250,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.text('Enviar carimbo'));
    await tester.pumpAndSettle();

    expect(
      find.text(
        'Você está a aproximadamente 347 m deste ponto. '
        'O limite permitido é de 100 m. Aproxime-se da TAG e tente novamente.',
      ),
      findsOneWidget,
    );
    expect(find.text('Carimbo confirmado com sucesso.'), findsNothing);
  });
}

class _OutsideRadiusApi extends ApiClient {
  @override
  Future<Map<String, dynamic>> stampTag({
    required String code,
    String? key,
    TagPosition? position,
  }) async {
    throw const ApiException(
      'Você está a aproximadamente 347 m deste ponto. '
      'O limite permitido é de 100 m. Aproxime-se da TAG e tente novamente.',
      statusCode: 409,
      code: 'fora_do_raio',
      details: <String, dynamic>{'distancia': 347, 'raio': 100},
    );
  }
}
