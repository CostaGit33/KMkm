import 'package:flutter_test/flutter_test.dart';
import 'package:mais1km/features/auth/password_reset_link_parser.dart';

void main() {
  group('PasswordResetLinkParser', () {
    test('extrai token de recuperação do link oficial HTTPS', () {
      const token = '0123456789abcdefghijklmnopqrstuvXYZ_-';
      expect(
        PasswordResetLinkParser.parse(
          'https://mais1km.novaagencian8n.online/?redefinir=$token',
        ),
        token,
      );
    });

    test('aceita somente o caminho raiz e a porta HTTPS padrão', () {
      const token = '0123456789abcdefghijklmnopqrstuvXYZ_-';
      expect(
        PasswordResetLinkParser.parse(
          'https://mais1km.novaagencian8n.online:443/?redefinir=$token',
        ),
        token,
      );
      expect(
        PasswordResetLinkParser.parse(
          'https://mais1km.novaagencian8n.online/t/eu-001?redefinir=$token',
        ),
        isNull,
      );
    });

    test('rejeita domínio, esquema e parâmetros duplicados', () {
      const token = '0123456789abcdefghijklmnopqrstuvXYZ_-';
      expect(
        PasswordResetLinkParser.parse('http://mais1km.novaagencian8n.online/?redefinir=$token'),
        isNull,
      );
      expect(
        PasswordResetLinkParser.parse('https://example.com/?redefinir=$token'),
        isNull,
      );
      expect(
        PasswordResetLinkParser.parse('https://mais1km.novaagencian8n.online/?redefinir=$token&redefinir=$token'),
        isNull,
      );
    });

    test('rejeita token vazio, curto, longo ou com caracteres fora do formato', () {
      final tooLong = List<String>.filled(201, 'a').join();
      final invalidCharacters = '${List<String>.filled(40, 'a').join()}%2F';
      expect(
        PasswordResetLinkParser.parse('https://mais1km.novaagencian8n.online/?redefinir='),
        isNull,
      );
      expect(
        PasswordResetLinkParser.parse('https://mais1km.novaagencian8n.online/?redefinir=curto'),
        isNull,
      );
      expect(
        PasswordResetLinkParser.parse('https://mais1km.novaagencian8n.online/?redefinir=$tooLong'),
        isNull,
      );
      expect(
        PasswordResetLinkParser.parse('https://mais1km.novaagencian8n.online/?redefinir=$invalidCharacters'),
        isNull,
      );
    });
  });
}
