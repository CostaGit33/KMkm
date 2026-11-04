import 'dart:convert';

/// Decodifica o payload de um registro URI NDEF (RTD_URI).
/// O primeiro byte é o código de compressão do prefixo; os bytes restantes
/// contêm o restante da URI em UTF-8.
class NdefUriParser {
  const NdefUriParser._();

  static const Map<int, String> _prefixes = {
    0x00: '',
    0x01: 'http://www.',
    0x02: 'https://www.',
    0x03: 'http://',
    0x04: 'https://',
    0x05: 'tel:',
    0x06: 'mailto:',
    0x07: 'ftp://anonymous:anonymous@',
    0x08: 'ftp://ftp.',
    0x09: 'ftps://',
    0x0A: 'sftp://',
    0x0B: 'smb://',
    0x0C: 'nfs://',
    0x0D: 'ftp://',
    0x0E: 'dav://',
    0x0F: 'news:',
    0x10: 'telnet://',
    0x11: 'imap:',
    0x12: 'rtsp://',
    0x13: 'urn:',
    0x14: 'pop:',
    0x15: 'sip:',
    0x16: 'sips:',
    0x17: 'tftp:',
    0x18: 'btspp://',
    0x19: 'btl2cap://',
    0x1A: 'btgoep://',
    0x1B: 'tcpobex://',
    0x1C: 'irdaobex://',
    0x1D: 'file://',
    0x1E: 'urn:epc:id:',
    0x1F: 'urn:epc:tag:',
    0x20: 'urn:epc:pat:',
    0x21: 'urn:epc:raw:',
    0x22: 'urn:epc:',
    0x23: 'urn:nfc:',
  };

  static String? decodeTextPayload(List<int> payload) {
    if (payload.length < 2) return null;
    try {
      final languageLength = payload.first & 0x3F;
      final textOffset = 1 + languageLength;
      if (textOffset >= payload.length) return null;
      final value = utf8.decode(payload.sublist(textOffset), allowMalformed: false).trim();
      final uri = Uri.tryParse(value);
      if (uri == null || !uri.hasScheme) return null;
      return value;
    } on FormatException {
      return null;
    }
  }

  static String? decodeUriPayload(List<int> payload) {
    if (payload.length < 2) return null;
    final prefix = _prefixes[payload.first];
    if (prefix == null) return null;
    try {
      final suffix = utf8.decode(payload.sublist(1), allowMalformed: false);
      final value = '$prefix$suffix'.trim();
      final uri = Uri.tryParse(value);
      if (uri == null || !uri.hasScheme) return null;
      return value;
    } on FormatException {
      return null;
    }
  }
}
