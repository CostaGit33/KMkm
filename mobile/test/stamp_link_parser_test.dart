import 'package:flutter_test/flutter_test.dart';
import 'package:mais1km/features/stamp/stamp_link_parser.dart';

void main() {
  group('StampLinkParser', () {
    test('extrai código e chave de URL válida, inclusive com caracteres escapados', () {
      final link = StampLinkParser.parse(
        '  https://mais1km.novaagencian8n.online/t/ponto-123?k=segredo%2Babc  ',
      );

      expect(link, isNotNull);
      expect(link!.code, 'ponto-123');
      expect(link.key, 'segredo+abc');
    });

    test('rejeita esquema inseguro, domínio diferente e caminho inválido', () {
      expect(
        StampLinkParser.parse('http://mais1km.novaagencian8n.online/t/a?k=b'),
        isNull,
      );
      expect(
        StampLinkParser.parse('https://example.com/t/a?k=b'),
        isNull,
      );
      expect(
        StampLinkParser.parse('https://mais1km.novaagencian8n.online/outro/a?k=b'),
        isNull,
      );
      expect(
        StampLinkParser.parse('https://mais1km.novaagencian8n.online/t/a/b?k=c'),
        isNull,
      );
    });

    test('rejeita chave ausente, vazia ou duplicada', () {
      expect(
        StampLinkParser.parse('https://mais1km.novaagencian8n.online/t/a'),
        isNull,
      );
      expect(
        StampLinkParser.parse('https://mais1km.novaagencian8n.online/t/a?k='),
        isNull,
      );
      expect(
        StampLinkParser.parse('https://mais1km.novaagencian8n.online/t/a?k=x&k=y'),
        isNull,
      );
    });

    test('rejeita URL sem código e porta não padrão', () {
      expect(
        StampLinkParser.parse('https://mais1km.novaagencian8n.online/t/?k=x'),
        isNull,
      );
      expect(
        StampLinkParser.parse('https://mais1km.novaagencian8n.online:444/t/a?k=x'),
        isNull,
      );
    });
  });
}
