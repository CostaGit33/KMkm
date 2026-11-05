import 'package:flutter_test/flutter_test.dart';
import 'package:mais1km/features/auth/password_reset_link_parser.dart';

void main() {
  group('PasswordResetLinkParser', () {
    const token = 'AbCdEf0123456789_-AbCdEf0123456789_-AbC';

    test('extrai token válido do App Link HTTPS', () {
      expect(
        PasswordResetLinkParser.parse(
          'https://mais1km.novaagencian8n.online/?redefinir=$token',
        ),
        token,
      );
    });

    test('rejeita esquema inseguro, host diferente e porta não padrão', () {
      expect(
        PasswordResetLinkParser.parse('http://mais1km.novaagencian8n.online/?redefinir=$token'),
        isNull,
      );
      expect(
        PasswordResetLinkParser.parse('https://example.com/?redefinir=$token'),
        isNull,
      );
      expect(
        PasswordResetLinkParser.parse('https://mais1km.novaagencian8n.online:444/?redefinir=$token'),
        isNull,
      );
    });

    test('rejeita caminho, fragmento, token ausente, curto ou duplicado', () {
      expect(
        PasswordResetLinkParser.parse('https://mais1km.novaagencian8n.online/outra?redefinir=$token'),
        isNull,
      );
      expect(
        PasswordResetLinkParser.parse('https://mais1km.novaagencian8n.online/?redefinir=$token#fragmento'),
        isNull,
      );
      expect(
        PasswordResetLinkParser.parse('https://mais1km.novaagencian8n.online/'),
        isNull,
      );
      expect(
        PasswordResetLinkParser.parse('https://mais1km.novaagencian8n.online/?redefinir=curto'),
        isNull,
      );
      expect(
        PasswordResetLinkParser.parse('https://mais1km.novaagencian8n.online/?redefinir=$token&redefinir=$token'),
        isNull,
      );
    });
  });
}
