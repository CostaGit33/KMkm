import 'dart:async';

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:nfc_manager/nfc_manager.dart';
import 'package:nfc_manager/nfc_manager_android.dart';
import 'package:nfc_manager/ndef_record.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/brand_theme.dart';
import 'stamp_link_parser.dart';
import 'ndef_uri_parser.dart';

/// Tela de captura de carimbo por link Mais1km recebido ou colado.
///
/// O app só solicita localização se a API disser que ela é necessária para o ponto.
/// A API lança [ApiException] para respostas HTTP não-2xx. [onSuccess] é chamado
/// somente depois que o envio retorna sem erro.
class StampPage extends StatefulWidget {
  const StampPage({
    super.key,
    required this.api,
    this.initialUri,
    this.onSuccess,
  });

  final ApiClient api;
  final Uri? initialUri;
  final VoidCallback? onSuccess;

  @override
  State<StampPage> createState() => _StampPageState();
}

class _StampPageState extends State<StampPage> {
  final _linkController = TextEditingController();
  StampLink? _stampLink;
  String? _message;
  bool _locationRequired = false;
  bool _showLocationSettings = false;
  bool _openDeviceLocationSettings = false;
  bool _submitting = false;
  bool _nfcScanning = false;
  bool _nfcSessionStarted = false;

  @override
  void initState() {
    super.initState();
    final uri = widget.initialUri;
    if (uri != null) {
      _stampLink = StampLinkParser.parse(uri.toString());
      if (_stampLink != null) {
        _message = 'Link reconhecido. Toque em “Enviar carimbo” para continuar.';
      }
    }
  }

  Future<void> _startNfcScan() async {
    if (_nfcScanning || _submitting) return;
    setState(() {
      _nfcScanning = true;
      _message = 'Aproxime a parte traseira do celular da TAG Mais1km.';
      _stampLink = null;
    });
    try {
      final availability = await NfcManager.instance.checkAvailability();
      if (!mounted) return;
      if (availability != NfcAvailability.enabled) {
        setState(() {
          _nfcScanning = false;
          _message = 'NFC indisponível. Confira se o aparelho tem NFC e se ele está ativado. Você também pode colar o link da TAG.';
        });
        return;
      }
      _nfcSessionStarted = true;
      await NfcManager.instance.startSession(
        // NDEF pode estar em TAGs Type 2 (ISO 14443) ou Type 5 (ISO 15693).
        // Restringir a ISO 14443 fazia o leitor parecer inerte em TAGs
        // válidas de outra tecnologia.
        pollingOptions: {
          NfcPollingOption.iso14443,
          NfcPollingOption.iso15693,
          NfcPollingOption.iso18092,
        },
        onDiscovered: (tag) async {
          try {
            final ndef = NdefAndroid.from(tag);
            if (ndef == null) {
              await _stopNfcSessionSafely();
              if (!mounted) return;
              setState(() {
                _nfcScanning = false;
                _message = 'TAG detectada, mas ela não é NDEF. Grave nela a URL completa da TAG Mais1km ou use o QR Code.';
              });
              return;
            }
            final message = ndef.cachedNdefMessage ?? await ndef.getNdefMessage();
            String? uriText;
            if (message != null) {
              for (final record in message.records) {
                final isUriRecord = record.typeNameFormat == TypeNameFormat.wellKnown &&
                    record.type.length == 1 &&
                    record.type.first == 0x55;
                if (isUriRecord) {
                  uriText = NdefUriParser.decodeUriPayload(record.payload);
                } else if (record.typeNameFormat == TypeNameFormat.wellKnown &&
                    record.type.length == 1 &&
                    record.type.first == 0x54) {
                  // Algumas ferramentas gravam a URL como texto NDEF em vez
                  // do registro URI. Aceita ambos, sem relaxar o host/caminho.
                  uriText = NdefUriParser.decodeTextPayload(record.payload);
                }
                uriText ??= NdefUriParser.decodePlainUriPayload(record.payload);
                if (uriText != null) break;
              }
            }
            await _stopNfcSessionSafely();
            if (!mounted) return;
            final parsed = uriText == null ? null : StampLinkParser.parse(uriText);
            setState(() {
              _nfcScanning = false;
              if (parsed == null) {
                _stampLink = null;
                _message = 'TAG detectada, mas não contém um link NDEF válido do Mais1km. Verifique se ela foi gravada com a URL completa da TAG.';
              } else {
                _stampLink = parsed;
                _message = 'TAG Mais1km lida. Validando o carimbo…';
              }
            });
            if (parsed != null) {
              // A leitura NFC é a ação explícita do participante. Tenta o
              // carimbo imediatamente; se o servidor exigir geofence, o
              // próximo passo continua sendo apresentado com consentimento
              // explícito para obter o GPS.
              unawaited(_submit());
            }
          } catch (_) {
            await _stopNfcSessionSafely();
            if (!mounted) return;
            setState(() {
              _nfcScanning = false;
              _message = 'A TAG foi detectada, mas não foi possível ler o conteúdo. Tente novamente mantendo o celular próximo por alguns segundos.';
            });
          }
        },
      );
    } catch (_) {
      await _stopNfcSessionSafely();
      if (!mounted) return;
      setState(() {
        _nfcScanning = false;
        _message = 'Não foi possível iniciar a leitura NFC. Ative o NFC nas configurações e tente novamente.';
      });
    }
  }

  Future<void> _stopNfcSessionSafely() async {
    if (!_nfcSessionStarted) return;
    _nfcSessionStarted = false;
    try {
      await NfcManager.instance.stopSession();
    } catch (_) {
      // A sessão pode ter sido encerrada pelo Android ou pelo ciclo de vida.
    }
  }

  Future<void> _stopNfcScan() async {
    if (!_nfcScanning) return;
    await _stopNfcSessionSafely();
    if (mounted) {
      setState(() {
        _nfcScanning = false;
        _message = 'Leitura NFC cancelada.';
      });
    }
  }

  void _parseManualLink() {
    final parsed = StampLinkParser.parse(_linkController.text);
    FocusScope.of(context).unfocus();
    setState(() {
      if (parsed == null) {
        _stampLink = null;
        _locationRequired = false;
        _showLocationSettings = false;
        _message = 'Link inválido. Use um link Mais1km completo recebido por QR ou NFC.';
      } else {
        _stampLink = parsed;
        _locationRequired = false;
        _showLocationSettings = false;
        _message = 'Link reconhecido. Toque em “Enviar carimbo” para continuar.';
        _linkController.clear();
      }
    });
  }

  Future<TagPosition> _currentPosition() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      throw const _LocationFailure(
        'Ative o serviço de localização do aparelho e tente novamente.',
        openDeviceSettings: true,
        showSettings: true,
      );
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.deniedForever) {
      throw const _LocationFailure(
        'A permissão foi bloqueada. Autorize a localização nas configurações do app.',
        openDeviceSettings: false,
        showSettings: true,
      );
    }
    if (permission == LocationPermission.denied) {
      throw const _LocationFailure(
        'A permissão de localização foi recusada. Você pode tentar novamente.',
      );
    }

    final position = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        timeLimit: Duration(seconds: 20),
      ),
    );
    if (!position.accuracy.isFinite ||
        position.accuracy <= 0 ||
        position.accuracy > 50) {
      throw const _LocationFailure(
        'O GPS ainda está impreciso. Vá para uma área aberta e tente novamente; o servidor aceita precisão de até 50 m.',
      );
    }
    return TagPosition(
      lat: position.latitude,
      lng: position.longitude,
      acc: position.accuracy,
    );
  }

  Future<void> _submit({bool includeLocation = false}) async {
    final link = _stampLink;
    if (link == null || _submitting) return;
    setState(() {
      _submitting = true;
      _message = null;
      _showLocationSettings = false;
      _locationRequired = false;
    });
    try {
      final position = includeLocation ? await _currentPosition() : null;
      await widget.api.stampTag(
        code: link.code,
        key: link.key,
        position: position,
      );
      if (!mounted) return;
      setState(() {
        _stampLink = null;
        _message = 'Carimbo confirmado com sucesso.';
      });
      widget.onSuccess?.call();
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() {
        if (error.statusCode == 409 &&
            error.code == 'localizacao_necessaria') {
          _locationRequired = true;
          _message = 'Este ponto exige localização. Toque abaixo para permitir o GPS e tentar novamente.';
        } else if (error.statusCode == 409 && error.code == 'gps_impreciso') {
          _locationRequired = true;
          _message = error.message;
        } else if (error.statusCode == 409 && error.code == 'fora_do_raio') {
          _locationRequired = true;
          // A ApiClient já traduz a resposta oficial e preserva distancia/raio
          // enviados pelo servidor; não recalculamos geofence no aparelho.
          _message = error.message;
        } else {
          _message = error.message;
        }
      });
    } on _LocationFailure catch (error) {
      if (!mounted) return;
      setState(() {
        _locationRequired = true;
        _message = error.message;
        _showLocationSettings = error.showSettings;
        _openDeviceLocationSettings = error.openDeviceSettings;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _locationRequired = includeLocation;
        _message = includeLocation
            ? 'Não foi possível obter o GPS. Confira as permissões e tente novamente.'
            : 'Não foi possível enviar o carimbo. Confira o link e tente novamente.';
      });
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  void dispose() {
    if (_nfcSessionStarted) unawaited(_stopNfcSessionSafely());
    _linkController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Conquistar carimbo')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: BrandPalette.darkCard,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: BrandPalette.darkRule),
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.nfc, color: BrandPalette.gold, size: 34),
                SizedBox(height: 12),
                Text(
                  'Aproxime ou escaneie',
                  style: TextStyle(
                    color: BrandPalette.cream,
                    fontSize: 21,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                SizedBox(height: 8),
                Text(
                  'Ao abrir um link Mais1km por QR ou NFC, ele aparecerá aqui. '
                  'Se o aparelho não abrir o app, você também pode colar o link.',
                  style: TextStyle(color: BrandPalette.darkMuted, height: 1.45),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: _nfcScanning ? _stopNfcScan : _startNfcScan,
            icon: Icon(_nfcScanning ? Icons.close : Icons.nfc),
            label: Text(_nfcScanning ? 'Cancelar leitura NFC' : 'Ler TAG agora'),
          ),
          const SizedBox(height: 8),
          const Text(
            'A leitura NFC funciona com a TAG próxima ao celular. Depois da leitura, o app valida a chave, a conta e a localização exigida pelo servidor.',
            style: TextStyle(color: BrandPalette.darkMuted, fontSize: 12, height: 1.4),
          ),
          const SizedBox(height: 18),
          TextField(
            controller: _linkController,
            keyboardType: TextInputType.url,
            textInputAction: TextInputAction.done,
            autocorrect: false,
            enableSuggestions: false,
            decoration: const InputDecoration(
              labelText: 'Link do carimbo',
              hintText: 'https://mais1km.novaagencian8n.online/t/…?k=…',
              border: OutlineInputBorder(),
              prefixIcon: Icon(Icons.link),
            ),
            onSubmitted: (_) => _parseManualLink(),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: _submitting || _nfcScanning ? null : _parseManualLink,
            icon: const Icon(Icons.content_paste_go),
            label: const Text('Usar link colado'),
          ),
          if (_stampLink != null) ...[
            const SizedBox(height: 18),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: BrandPalette.darkSurface,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Row(
                children: [
                  Icon(Icons.verified_outlined, color: BrandPalette.gold),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Link Mais1km pronto para validação.',
                      style: TextStyle(color: BrandPalette.cream),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: _submitting || _nfcScanning
                  ? null
                  : () => _submit(includeLocation: _locationRequired),
              icon: _submitting
                  ? const SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Icon(_locationRequired ? Icons.location_on : Icons.stars_outlined),
              label: Text(
                _submitting
                    ? 'Enviando…'
                    : _locationRequired
                        ? 'Permitir GPS e tentar novamente'
                        : 'Enviar carimbo',
              ),
            ),
          ],
          if (_message != null) ...[
            const SizedBox(height: 18),
            Semantics(
              liveRegion: true,
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: _locationRequired
                      ? const Color(0xFF3B301E)
                      : BrandPalette.darkSurface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: _locationRequired
                        ? BrandPalette.gold
                        : BrandPalette.darkRule,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _message!,
                      style: const TextStyle(
                        color: BrandPalette.cream,
                        height: 1.4,
                      ),
                    ),
                    if (_locationRequired) ...[
                      const SizedBox(height: 8),
                      const Text(
                        'O app só pede a localização depois que o servidor informa que este ponto exige validação. A posição é enviada apenas junto desta tentativa de carimbo.',
                        style: TextStyle(
                          color: BrandPalette.darkMuted,
                          height: 1.4,
                        ),
                      ),
                      if (_showLocationSettings) ...[
                        const SizedBox(height: 8),
                        TextButton.icon(
                          onPressed: () async {
                            if (_openDeviceLocationSettings) {
                              await Geolocator.openLocationSettings();
                            } else {
                              await Geolocator.openAppSettings();
                            }
                          },
                          icon: const Icon(Icons.settings_outlined),
                          label: const Text('Abrir configurações'),
                        ),
                      ],
                    ],
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}


class _LocationFailure implements Exception {
  const _LocationFailure(
    this.message, {
    this.openDeviceSettings = false,
    this.showSettings = false,
  });

  final String message;
  final bool openDeviceSettings;
  final bool showSettings;
}
