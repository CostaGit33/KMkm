import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:mais1km/core/api/api_client.dart';

void main() {
  late HttpServer server;
  late ApiClient api;
  late List<Map<String, dynamic>> requests;
  late int responseStatus;
  late String responseCode;
  var clearedSessions = 0;

  setUp(() async {
    requests = [];
    responseStatus = 200;
    responseCode = 'erro_teste';
    clearedSessions = 0;
    server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    server.listen((request) async {
      final bytes = await request.fold<List<int>>(
        <int>[],
        (buffer, chunk) => buffer..addAll(chunk),
      );
      final text = utf8.decode(bytes);
      final body = text.isEmpty ? null : jsonDecode(text);
      requests.add({
        'method': request.method,
        'path': request.uri.path,
        'query': request.uri.queryParameters,
        'body': body,
        'cookie': request.headers.value(HttpHeaders.cookieHeader),
      });
      if (responseStatus < 200 || responseStatus >= 300) {
        request.response.statusCode = responseStatus;
        request.response.headers.contentType = ContentType.json;
        request.response.write(jsonEncode({'erro': responseCode}));
      } else {
        request.response.statusCode = responseStatus;
        request.response.headers.contentType = ContentType.json;
        request.response.write(jsonEncode({'ok': true}));
      }
      await request.response.close();
    });
    api = ApiClient(
      baseUrl: 'http://127.0.0.1:${server.port}',
      sessionCookieReader: () async => 'cookie-de-teste',
      sessionCookieClearer: () async {
        clearedSessions++;
      },
    );
  });

  tearDown(() async {
    api.dispose();
    await server.close(force: true);
  });

  test('métodos usam caminhos, verbos, payloads e cookie do contrato', () async {
    final updated = await api.updateAccount(
      name: ' Ana ',
      email: ' ana@example.test ',
      currentPassword: 'senha-atual',
      newPassword: 'senha-nova-segura',
    );
    expect(updated, {'ok': true});
    await api.fetchGamificationMe();
    await api.fetchGamificationPodium(period: 'geral', limit: 7);
    await api.updateGamificationParticipation(optIn: true, alias: 'Ana');
    await api.stampTag(
      code: 'tag-azul',
      key: 'chave-privada',
      position: const TagPosition(lat: -16.37, lng: -39.58, acc: 8.5),
    );
    await api.deleteAccount();

    expect(requests.map((request) => '${request['method']} ${request['path']}'), [
      'PUT /api/conta',
      'GET /api/gamificacao/me',
      'GET /api/gamificacao/podio',
      'PUT /api/gamificacao/participacao',
      'POST /api/tags/tag-azul/carimbar',
      'DELETE /api/eu',
    ]);
    expect(requests[0]['body'], {
      'nome': 'Ana',
      'email': 'ana@example.test',
      'senhaAtual': 'senha-atual',
      'senhaNova': 'senha-nova-segura',
    });
    expect(requests[1]['body'], isNull);
    expect(requests[2]['query'], {'periodo': 'geral', 'limite': '7'});
    expect(requests[3]['body'], {'optIn': true, 'alias': 'Ana'});
    expect(requests[4]['body'], {
      'chave': 'chave-privada',
      'pos': {'lat': -16.37, 'lng': -39.58, 'acc': 8.5},
    });
    expect(requests.every((request) =>
        request['cookie'] == 'mais1km_session=cookie-de-teste'), isTrue);
    expect(clearedSessions, 1);
  });

  test('opcionais ausentes não são enviados e pódio mensal usa contrato padrão', () async {
    await api.updateAccount(name: 'Ana', email: 'ana@example.test');
    await api.fetchGamificationPodium();
    await api.updateGamificationParticipation(optIn: false);
    await api.stampTag(code: 'tag-verde');

    expect(requests[0]['body'], {'nome': 'Ana', 'email': 'ana@example.test'});
    expect(requests[1]['query'], isEmpty);
    expect(requests[2]['body'], {'optIn': false});
    expect(requests[3]['body'], isEmpty);
  });

  for (final (status, code) in <(int, String)>[
    (401, 'sessao_conta_necessaria'),
    (403, 'chave_invalida'),
    (409, 'localizacao_necessaria'),
    (409, 'gps_impreciso'),
    (429, 'muitos_carimbos'),
    (500, 'erro_interno'),
  ]) {
    test('preserva erro HTTP $status ($code), sem indicar sucesso', () async {
      responseStatus = status;
      responseCode = code;
      try {
        await api.stampTag(code: 'tag-teste');
        fail('Uma resposta HTTP $status não deve resultar em sucesso.');
      } on ApiException catch (error) {
        expect(error.statusCode, status);
        expect(error.code, code);
        expect(error.message, isNotEmpty);
        expect(error.message.toLowerCase(), isNot(contains('sucesso')));
      }
    });
  }

  test('falha ao excluir não remove a sessão armazenada', () async {
    responseStatus = 409;
    responseCode = 'conflito_teste';
    await expectLater(api.deleteAccount(), throwsA(isA<ApiException>()));
    expect(clearedSessions, 0);
  });
}
