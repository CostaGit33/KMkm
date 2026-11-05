/// Extrai com segurança o token de redefinição enviado por e-mail.
///
/// O token só é aceito no domínio oficial, em HTTPS e no caminho raiz.
/// O chamador deve mantê-lo apenas em memória e nunca registrá-lo em logs.
class PasswordResetLinkParser {
  const PasswordResetLinkParser._();

  static const host = 'mais1km.novaagencian8n.online';

  static String? parse(String input) {
    final Uri uri;
    try {
      uri = Uri.parse(input.trim());
    } on FormatException {
      return null;
    }

    if (uri.scheme.toLowerCase() != 'https' ||
        uri.host.toLowerCase() != host ||
        uri.userInfo.isNotEmpty ||
        (uri.hasPort && uri.port != 443) ||
        (uri.path.isNotEmpty && uri.path != '/') ||
        uri.fragment.isNotEmpty) {
      return null;
    }

    final values = uri.queryParametersAll['redefinir'];
    if (values == null || values.length != 1) return null;
    final token = values.single;
    if (token.length < 30 ||
        token.length > 200 ||
        !RegExp(r'^[A-Za-z0-9_-]+$').hasMatch(token)) {
      return null;
    }
    return token;
  }
}
