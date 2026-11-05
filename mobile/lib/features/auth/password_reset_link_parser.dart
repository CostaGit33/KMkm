/// Token de redefinição recebido por App Link do Mais1km.
class PasswordResetLinkParser {
  const PasswordResetLinkParser._();

  static const host = 'mais1km.novaagencian8n.online';
  static final RegExp _tokenPattern = RegExp(r'^[A-Za-z0-9_-]{30,200}$');

  /// Aceita somente https://<host>/?redefinir=<token>, sem parâmetros duplicados.
  /// Não registra nem persiste o token; ele é usado uma única vez pela API.
  static String? parse(String input) {
    final value = input.trim();
    if (value.isEmpty) return null;

    final Uri uri;
    try {
      uri = Uri.parse(value);
    } on FormatException {
      return null;
    }

    if (uri.scheme.toLowerCase() != 'https' ||
        uri.host.toLowerCase() != host ||
        uri.userInfo.isNotEmpty ||
        (uri.hasPort && uri.port != 443) ||
        uri.path != '/' ||
        uri.fragment.isNotEmpty) {
      return null;
    }

    final tokens = uri.queryParametersAll['redefinir'];
    if (tokens == null || tokens.length != 1) return null;
    final token = tokens.single;
    return _tokenPattern.hasMatch(token) ? token : null;
  }
}
