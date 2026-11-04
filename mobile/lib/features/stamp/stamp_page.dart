import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/brand_theme.dart';
import 'stamp_link_parser.dart';

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
          _message = 'O servidor recebeu uma posição com precisão insuficiente. Vá para uma área aberta e tente novamente.';
        } else if (error.statusCode == 409 && error.code == 'fora_do_raio') {
          _locationRequired = true;
          _message = 'Você está fora do raio permitido para este ponto. Aproxime-se do local e tente novamente.';
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
          const SizedBox(height: 20),
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
            onPressed: _submitting ? null : _parseManualLink,
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
              onPressed: _submitting
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
