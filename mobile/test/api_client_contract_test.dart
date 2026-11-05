import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:mais1km/core/api/api_client.dart';

void main() {
  late ApiClient api;
  late List<Map<String, dynamic>> requests;
  late int responseStatus;
  late String responseCode;
  var clearedSessions = 0;

  setUp(() {
    requests = [];
    responseStatus = 200;
    responseCode = 'erro_teste';
    clearedSessions = 0;
    final client = _FakeHttpClient((method, uri, headers, text) {
      final body = text.isEmpty ? null : jsonDecode(text);
      requests.add({
        'method': method,
        'path': uri.path,
        'query': uri.queryParameters,
        'body': body,
        'cookie': headers['cookie'],
      });
      final payload = responseStatus < 200 || responseStatus >= 300
          ? {'erro': responseCode}
          : {'ok': true};
      return _FakeResponse(responseStatus, jsonEncode(payload));
    });
    api = ApiClient(
      httpClient: client,
      baseUrl: 'https://api.test',
      sessionCookieReader: () async => 'cookie-de-teste',
      sessionCookieClearer: () async {
        clearedSessions++;
      },
    );
  });

  tearDown(() => api.dispose());

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

  test('envia token e nova senha ao endpoint de redefinição sem autenticação', () async {
    final result = await api.resetPassword(
      token: 'token-de-teste-comprido-12345678901234567890',
      password: 'nova-senha-segura',
    );

    expect(result, {'ok': true});
    expect(requests.single['method'], 'POST');
    expect(requests.single['path'], '/api/conta/redefinir-senha');
    expect(requests.single['body'], {
      'token': 'token-de-teste-comprido-12345678901234567890',
      'senha': 'nova-senha-segura',
    });
    expect(requests.single['cookie'], isNull);
    expect(clearedSessions, 0);
  });

  test('falha ao excluir não remove a sessão armazenada', () async {
    responseStatus = 409;
    responseCode = 'conflito_teste';
    await expectLater(api.deleteAccount(), throwsA(isA<ApiException>()));
    expect(clearedSessions, 0);
  });
}

class _FakeHttpClient implements HttpClient {
  _FakeHttpClient(this._respond);

  final _FakeResponse Function(
    String method,
    Uri uri,
    Map<String, String> headers,
    String body,
  ) _respond;

  @override
  Future<HttpClientRequest> openUrl(String method, Uri url) async =>
      _FakeHttpClientRequest(method, url, _respond);

  @override
  void close({bool force = false}) {}

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _FakeHttpClientRequest implements HttpClientRequest {
  _FakeHttpClientRequest(this.method, this.uri, this._respond);

  @override
  final String method;

  @override
  final Uri uri;

  final _RecordingHeaders _headers = _RecordingHeaders();
  final StringBuffer _body = StringBuffer();
  final _FakeResponse Function(
    String method,
    Uri uri,
    Map<String, String> headers,
    String body,
  ) _respond;

  @override
  HttpHeaders get headers => _headers;

  @override
  void write(Object? object) => _body.write(object);

  @override
  Future<HttpClientResponse> close() async =>
      _respond(method, uri, _headers.values, _body.toString());

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _RecordingHeaders implements HttpHeaders {
  final Map<String, String> values = {};

  @override
  void set(String name, Object value, {bool preserveHeaderCase = false}) {
    values[name.toLowerCase()] = value.toString();
  }

  @override
  ContentType? get contentType {
    final value = values['content-type'];
    return value == null ? null : ContentType.parse(value);
  }

  @override
  set contentType(ContentType? value) {
    if (value != null) values['content-type'] = value.mimeType;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _FakeResponse extends Stream<List<int>> implements HttpClientResponse {
  _FakeResponse(this.statusCode, String body) : _bytes = utf8.encode(body);

  @override
  final int statusCode;

  final List<int> _bytes;

  @override
  List<Cookie> get cookies => const [];

  @override
  StreamSubscription<List<int>> listen(
    void Function(List<int>)? onData, {
    Function? onError,
    void Function()? onDone,
    bool? cancelOnError,
  }) => Stream<List<int>>.value(_bytes).listen(
    onData,
    onError: onError,
    onDone: onDone,
    cancelOnError: cancelOnError,
  );

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
