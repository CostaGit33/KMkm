import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:mais1km/features/stamp/ndef_uri_parser.dart';
import 'package:mais1km/features/stamp/stamp_link_parser.dart';

void main() {
  group('NdefUriParser', () {
    test('decodifica URI HTTPS compactada no formato NDEF', () {
      final payload = <int>[0x04, ...utf8.encode('mais1km.novaagencian8n.online/t/eu-001?k=abc')];
      expect(
        NdefUriParser.decodeUriPayload(payload),
        'https://mais1km.novaagencian8n.online/t/eu-001?k=abc',
      );
    });

    test('decodifica prefixo HTTPS com www', () {
      final payload = <int>[0x02, ...utf8.encode('example.com/path')];
      expect(NdefUriParser.decodeUriPayload(payload), 'https://www.example.com/path');
    });

    test('decodifica URL gravada como registro de texto NDEF', () {
      final text = 'https://mais1km.novaagencian8n.online/t/eu-002?k=xyz';
      final payload = <int>[0x02, ...utf8.encode('pt'), ...utf8.encode(text)];
      expect(NdefUriParser.decodeTextPayload(payload), text);
    });

    test('rejeita texto NDEF sem URL', () {
      final payload = <int>[0x02, ...utf8.encode('pt'), ...utf8.encode('não é link')];
      expect(NdefUriParser.decodeTextPayload(payload), isNull);
    });

    test('aceita URL em payload simples de registro MIME ou external', () {
      final payload = utf8.encode(
        'https://mais1km.novaagencian8n.online/t/eu-003?k=def',
      );
      expect(
        NdefUriParser.decodePlainUriPayload(payload),
        'https://mais1km.novaagencian8n.online/t/eu-003?k=def',
      );
    });

    test('rejeita payload vazio, curto ou com prefixo desconhecido', () {
      expect(NdefUriParser.decodeUriPayload([]), isNull);
      expect(NdefUriParser.decodeUriPayload([0x04]), isNull);
      expect(NdefUriParser.decodeUriPayload([0xFF, 0x41]), isNull);
    });

    test('a URI lida é reconhecida pelo parser de links Mais1km', () {
      final payload = <int>[0x04, ...utf8.encode('mais1km.novaagencian8n.online/t/eu-001?k=abc')];
      final uri = NdefUriParser.decodeUriPayload(payload);
      expect(uri, isNotNull);
      expect(StampLinkParser.parse(uri!)?.code, 'eu-001');
      expect(StampLinkParser.parse(uri)?.key, 'abc');
    });
  });
}
