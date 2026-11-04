/// Dados de um link Mais1km autorizado a solicitar um carimbo.
class StampLink {
  const StampLink({required this.code, required this.key});

  final String code;
  final String key;
}

/// Interpreta links no formato https://mais1km.novaagencian8n.online/t/:codigo?k=...
///
/// Retorna null para links malformados, de outro host, caminho, esquema ou sem
/// um único parâmetro `k` não vazio. Não faz I/O e não registra os dados.
class StampLinkParser {
  const StampLinkParser._();

  static const host = 'mais1km.novaagencian8n.online';

  static StampLink? parse(String input) {
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
        uri.fragment.isNotEmpty) {
      return null;
    }

    final segments = uri.pathSegments;
    if (segments.length != 2 || segments[0] != 't') return null;
    final code = segments[1].trim();
    if (code.isEmpty || code.contains('/') || code.contains(r'\')) return null;

    final keys = uri.queryParametersAll['k'];
    if (keys == null || keys.length != 1 || keys.single.isEmpty) return null;

    return StampLink(code: code, key: keys.single);
  }
}
