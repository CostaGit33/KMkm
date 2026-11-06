import 'dart:async';
import 'dart:convert';
import 'dart:developer' as developer;
import 'dart:io';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../models/catalog_snapshot.dart';
import '../models/notebook_snapshot.dart';

class ApiException implements Exception {
  const ApiException(
    this.message, {
    this.statusCode,
    this.code,
    this.details = const <String, dynamic>{},
  });

  final String message;
  final int? statusCode;
  final String? code;
  /// Dados seguros e estruturados retornados pela API (distância, raio, precisão).
  /// Não inclui corpo bruto, chave da TAG nem cookie de sessão.
  final Map<String, dynamic> details;

  @override
  String toString() => message;
}

/// Posição opcional enviada ao validar um carimbo de tag.
class TagPosition {
  const TagPosition({required this.lat, required this.lng, required this.acc});

  final double lat;
  final double lng;
  final double acc;

  Map<String, double> toJson() => {'lat': lat, 'lng': lng, 'acc': acc};
}

class ApiClient {
  ApiClient({
    FlutterSecureStorage? secureStorage,
    HttpClient? httpClient,
    String? baseUrl,
    Future<String?> Function()? sessionCookieReader,
    Future<void> Function()? sessionCookieClearer,
  })  : _secureStorage = secureStorage ?? const FlutterSecureStorage(),
        // Constructor keeps public injection names while the backing fields stay private.
        // ignore: prefer_initializing_formals
        _httpClient = httpClient,
        _baseUrl = baseUrl ?? ApiClient.baseUrl,
        // ignore: prefer_initializing_formals
        _sessionCookieReader = sessionCookieReader,
        // ignore: prefer_initializing_formals
        _sessionCookieClearer = sessionCookieClearer;

  static const String baseUrl = 'https://mais1km.novaagencian8n.online';
  static const String _sessionKey = 'mais1km_session_cookie';

  final FlutterSecureStorage _secureStorage;
  final String _baseUrl;
  final Future<String?> Function()? _sessionCookieReader;
  final Future<void> Function()? _sessionCookieClearer;
  HttpClient? _httpClient;

  HttpClient get _client => _httpClient ??= HttpClient();

  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    return _authenticate('/api/conta/entrar', {
      'email': email.trim(),
      'senha': password,
    });
  }

  Future<Map<String, dynamic>> register({
    required String name,
    required String email,
    required String password,
  }) async {
    return _authenticate('/api/conta/criar', {
      'nome': name.trim(),
      'email': email.trim(),
      'senha': password,
    });
  }

  Future<Map<String, dynamic>> _authenticate(
    String path,
    Map<String, dynamic> body,
  ) async {
    final result = await _request('POST', path, body: body);
    final cookie = result.cookies
        .where((item) => item.name == 'mais1km_session')
        .firstOrNull;
    if (cookie == null || cookie.value.isEmpty) {
      throw const ApiException(
        'A API respondeu, mas não enviou a sessão segura esperada.',
      );
    }
    await _writeSessionCookie(cookie.value);
    return _asMap(result.data);
  }

  Future<Map<String, dynamic>> currentSession() async {
    final cookie = await _readSessionCookie();
    if (cookie == null || cookie.isEmpty) {
      throw const ApiException('Sessão não encontrada.', statusCode: 401);
    }

    try {
      final result = await _request('GET', '/api/conta/sessao', authenticated: true);
      return _asMap(result.data);
    } on ApiException catch (error) {
      if (error.statusCode == 401 || error.statusCode == 403) {
        await clearSession();
      }
      rethrow;
    }
  }

  Future<void> logout() async {
    try {
      await _request('POST', '/api/conta/sair', authenticated: true);
    } finally {
      await clearSession();
    }
  }

  /// Atualiza nome/e-mail e, se informado, senha atual e nova senha.
  Future<Map<String, dynamic>> updateAccount({
    required String name,
    required String email,
    String? currentPassword,
    String? newPassword,
  }) async {
    final body = <String, dynamic>{
      'nome': name.trim(),
      'email': email.trim(),
    };
    if (currentPassword != null) body['senhaAtual'] = currentPassword;
    if (newPassword != null) body['senhaNova'] = newPassword;
    final response = await _request(
      'PUT',
      '/api/conta',
      body: body,
      authenticated: true,
    );
    return _asMap(response.data);
  }

  /// Exclui a conta; a sessão local só é removida após resposta HTTP 2xx.
  Future<void> deleteAccount() async {
    await _request('DELETE', '/api/eu', authenticated: true);
    await clearSession();
  }

  Future<Map<String, dynamic>> fetchGamificationMe() async {
    final response = await _request(
      'GET',
      '/api/gamificacao/me',
      authenticated: true,
    );
    return _asMap(response.data);
  }

  /// Busca o pódio mensal (padrão) ou geral e, opcionalmente, limita resultados.
  Future<Map<String, dynamic>> fetchGamificationPodium({
    String? period,
    int? limit,
  }) async {
    final query = <String, String>{};
    if (period != null) query['periodo'] = period;
    if (limit != null) query['limite'] = limit.toString();
    final path = Uri(
      path: '/api/gamificacao/podio',
      queryParameters: query.isEmpty ? null : query,
    ).toString();
    final response = await _request('GET', path, authenticated: true);
    return _asMap(response.data);
  }

  Future<Map<String, dynamic>> updateGamificationParticipation({
    required bool optIn,
    String? alias,
  }) async {
    final body = <String, dynamic>{'optIn': optIn};
    if (alias != null) body['alias'] = alias;
    final response = await _request(
      'PUT',
      '/api/gamificacao/participacao',
      body: body,
      authenticated: true,
    );
    return _asMap(response.data);
  }

  Future<Map<String, dynamic>> stampTag({
    required String code,
    String? key,
    TagPosition? position,
  }) async {
    final body = <String, dynamic>{};
    if (key != null) body['chave'] = key;
    if (position != null) body['pos'] = position.toJson();
    final response = await _request(
      'POST',
      '/api/tags/${Uri.encodeComponent(code)}/carimbar',
      body: body,
      authenticated: true,
    );
    return _asMap(response.data);
  }

  Future<CatalogSnapshot> fetchCatalog() async {
    final response = await _request('GET', '/api/catalogo');
    return CatalogSnapshot.fromJson(_asMap(response.data));
  }

  Future<List<NotebookPointImage>> fetchPointImages(String code) async {
    final response = await _request(
      'GET',
      '/api/pontos/${Uri.encodeComponent(code)}/imagens',
    );
    final payload = _asMap(response.data);
    final rawImages = payload['imagens'];
    if (rawImages is! List) return const <NotebookPointImage>[];
    return rawImages
        .whereType<Map>()
        .map((item) => NotebookPointImage.fromJson(Map<String, dynamic>.from(item)))
        .where((image) => image.url.isNotEmpty)
        .toList();
  }

  Future<NotebookSnapshot> fetchNotebook() async {
    final response = await _request('GET', '/api/caderneta', authenticated: true);
    return NotebookSnapshot.fromJson(_asMap(response.data));
  }

  Future<void> requestPasswordRecovery(String email) async {
    await _request(
      'POST',
      '/api/conta/recuperar-senha',
      body: {'email': email.trim()},
      authenticated: false,
    );
  }

  Future<String?> _readSessionCookie() async {
    final reader = _sessionCookieReader;
    if (reader != null) return reader();
    try {
      return await _secureStorage.read(key: _sessionKey);
    } catch (_) {
      throw const ApiException(
        'Não foi possível acessar o armazenamento seguro do aparelho.',
      );
    }
  }

  Future<void> _writeSessionCookie(String value) async {
    try {
      await _secureStorage.write(key: _sessionKey, value: value);
    } catch (_) {
      throw const ApiException(
        'Não foi possível proteger a sessão neste aparelho.',
      );
    }
  }

  Future<void> clearSession() async {
    if (_sessionCookieClearer != null) {
      await _sessionCookieClearer();
      return;
    }
    try {
      await _secureStorage.delete(key: _sessionKey);
    } catch (_) {
      throw const ApiException(
        'Não foi possível remover a sessão armazenada no aparelho.',
      );
    }
  }

  Future<_ApiResponse> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    bool authenticated = false,
  }) async {
    final uri = Uri.parse('$_baseUrl$path');
    try {
      final request = await _client.openUrl(method, uri).timeout(
            const Duration(seconds: 20),
          );
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');
      if (body != null) {
        request.headers.contentType = ContentType.json;
        request.write(jsonEncode(body));
      }
      if (authenticated) {
        final cookie = await _readSessionCookie();
        if (cookie != null && cookie.isNotEmpty) {
          request.headers.set(
            HttpHeaders.cookieHeader,
            'mais1km_session=$cookie',
          );
        }
      } else if (method == 'GET' && path == '/api/conta/sessao') {
        final cookie = await _readSessionCookie();
        if (cookie != null && cookie.isNotEmpty) {
          request.headers.set(
            HttpHeaders.cookieHeader,
            'mais1km_session=$cookie',
          );
        }
      }
      final response = await request.close().timeout(
            const Duration(seconds: 20),
          );
      final text = await response.transform(utf8.decoder).join();
      final decoded = text.isEmpty ? <String, dynamic>{} : _decode(text);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        final payload = decoded is Map<String, dynamic>
            ? decoded
            : <String, dynamic>{};
        final code = payload['erro']?.toString();
        throw ApiException(
          _friendlyMessage(code, response.statusCode, payload),
          statusCode: response.statusCode,
          code: code,
          details: <String, dynamic>{
            for (final field in const ['distancia', 'raio', 'precisao', 'request_id'])
              if (payload[field] is num || payload[field] is String)
                field: payload[field],
          },
        );
      }
      return _ApiResponse(data: decoded, cookies: response.cookies);
    } on ApiException {
      rethrow;
    } on SocketException {
      throw const ApiException(
        'Não foi possível conectar. Verifique sua internet e tente novamente.',
      );
    } on TimeoutException {
      throw const ApiException(
        'A conexão demorou mais que o esperado. Tente novamente.',
      );
    } on HandshakeException {
      throw const ApiException(
        'Não foi possível validar a conexão segura com o servidor.',
      );
    } on FormatException {
      throw const ApiException('A API retornou uma resposta inválida.');
    } catch (error, stackTrace) {
      // Diagnóstico técnico sem registrar corpo, chave da TAG, cookie ou coordenadas.
      developer.log(
        'Falha inesperada na API ($method $path): ${error.runtimeType}',
        name: 'mais1km.api',
        error: error,
        stackTrace: stackTrace,
      );
      throw ApiException(
        'Falha inesperada ao comunicar com o servidor (${error.runtimeType}). '
        'Tente novamente. Se persistir, informe este código ao suporte.',
      );
    }
  }

  dynamic _decode(String value) => jsonDecode(value);

  Map<String, dynamic> _asMap(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    throw const ApiException('Formato de resposta inesperado da API.');
  }

  String _friendlyMessage(
    String? code,
    int status,
    Map<String, dynamic> payload,
  ) {
    switch (code) {
      case 'credenciais_invalidas':
        return 'E-mail ou senha incorretos.';
      case 'email_ja_cadastrado':
        return 'Este e-mail já possui uma conta.';
      case 'dados_conta_invalidos':
        return 'Confira os dados informados.';
      case 'senha_igual_ao_email':
        return 'A senha não pode ser igual ao e-mail.';
      case 'senha_atual_invalida':
        return 'A senha atual não confere.';
      case 'chave_invalida':
        return 'A chave deste ponto não é válida.';
      case 'fora_do_raio':
        final distancia = _inteiroPositivo(payload['distancia']);
        final raio = _inteiroPositivo(payload['raio']);
        if (distancia != null && raio != null) {
          return 'Você está a aproximadamente $distancia m deste ponto. '
              'O limite permitido é de $raio m. Aproxime-se da TAG e tente novamente.';
        }
        return 'Você está fora do raio permitido para este ponto. Aproxime-se da TAG e tente novamente.';
      case 'gps_impreciso':
        final precisao = _inteiroPositivo(payload['precisao']);
        if (precisao != null) {
          return 'A precisão atual do GPS é de aproximadamente $precisao m. '
              'O limite aceito é de 50 m. Vá para uma área aberta e tente novamente.';
        }
        return 'O GPS está impreciso. Vá para uma área aberta e tente novamente.';
      case 'localizacao_necessaria':
        return 'Este ponto exige localização. Permita o GPS para validar o carimbo.';
      case 'rate_limited':
      case 'muitas_tentativas':
      case 'muitos_carimbos':
        return 'Muitas tentativas. Aguarde um pouco e tente novamente.';
      default:
        if (status == 401) return 'Sua sessão expirou. Entre novamente.';
        if (status == 403) return 'Esta solicitação não foi autorizada.';
        if (status == 409) {
          return 'Não foi possível concluir devido ao estado atual do recurso.';
        }
        if (status == 429) {
          return 'Muitas tentativas. Aguarde um pouco e tente novamente.';
        }
        if (status >= 500) {
          return 'O servidor está temporariamente indisponível.';
        }
        return 'Não foi possível concluir. Verifique os dados e tente novamente.';
    }
  }

  int? _inteiroPositivo(dynamic value) {
    final parsed = value is num ? value.round() : int.tryParse('$value');
    return parsed != null && parsed > 0 ? parsed : null;
  }

  void dispose() => _httpClient?.close(force: true);
}

class _ApiResponse {
  const _ApiResponse({required this.data, required this.cookies});

  final dynamic data;
  final List<Cookie> cookies;
}

extension<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;
}
