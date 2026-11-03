import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../models/catalog_snapshot.dart';
import '../models/notebook_snapshot.dart';

class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode, this.code});

  final String message;
  final int? statusCode;
  final String? code;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({
    FlutterSecureStorage? secureStorage,
    this._httpClient,
  }) : _secureStorage = secureStorage ?? const FlutterSecureStorage();

  static const String baseUrl = 'https://mais1km.novaagencian8n.online';
  static const String _sessionKey = 'mais1km_session_cookie';

  final FlutterSecureStorage _secureStorage;
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

  Future<CatalogSnapshot> fetchCatalog() async {
    final response = await _request('GET', '/api/catalogo');
    return CatalogSnapshot.fromJson(_asMap(response.data));
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
    final uri = Uri.parse('$baseUrl$path');
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
        final payload = decoded is Map<String, dynamic> ? decoded : {};
        final code = payload['erro']?.toString();
        throw ApiException(
          _friendlyMessage(code, response.statusCode),
          statusCode: response.statusCode,
          code: code,
        );
      }

      return _ApiResponse(
        data: decoded,
        cookies: response.cookies,
      );
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
    } catch (_) {
      throw const ApiException(
        'Não foi possível concluir a solicitação. Tente novamente.',
      );
    }
  }

  dynamic _decode(String value) => jsonDecode(value);

  Map<String, dynamic> _asMap(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    throw const ApiException('Formato de resposta inesperado da API.');
  }

  String _friendlyMessage(String? code, int status) {
    switch (code) {
      case 'credenciais_invalidas':
        return 'E-mail ou senha incorretos.';
      case 'email_ja_cadastrado':
        return 'Este e-mail já possui uma conta.';
      case 'dados_conta_invalidos':
        return 'Confira os dados informados.';
      case 'senha_igual_ao_email':
        return 'A senha não pode ser igual ao e-mail.';
      case 'rate_limited':
      case 'muitas_tentativas':
        return 'Muitas tentativas. Aguarde um pouco e tente novamente.';
      default:
        if (status == 429) {
          return 'Muitas tentativas. Aguarde um pouco e tente novamente.';
        }
        if (status >= 500) {
          return 'O servidor está temporariamente indisponível.';
        }
        return 'Não foi possível concluir. Verifique os dados e tente novamente.';
    }
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
