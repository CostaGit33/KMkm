import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../../core/models/catalog_snapshot.dart';
import '../../core/theme/brand_theme.dart';

class CatalogMap extends StatelessWidget {
  const CatalogMap({
    super.key,
    required this.points,
    required this.onSelectPoint,
  });

  final List<CatalogPoint> points;
  final ValueChanged<CatalogPoint> onSelectPoint;

  static const _tilesUrl =
      'https://mais1km.novaagencian8n.online/api/map-tiles/{z}/{x}/{y}.png';

  @override
  Widget build(BuildContext context) {
    final geolocated = points.where((point) {
      final lat = point.latitude;
      final lng = point.longitude;
      return lat != null &&
          lng != null &&
          lat.isFinite &&
          lng.isFinite &&
          lat >= -90 &&
          lat <= 90 &&
          lng >= -180 &&
          lng <= 180;
    }).toList();

    if (geolocated.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.map_outlined, size: 52, color: Color(0xFF6F786F)),
              SizedBox(height: 14),
              Text(
                'Ainda não há pontos publicados com coordenadas válidas.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Color(0xFF6F786F), height: 1.45),
              ),
            ],
          ),
        ),
      );
    }

    final first = geolocated.first;
    final center = LatLng(first.latitude!, first.longitude!);
    final bounds = geolocated
        .map((point) => LatLng(point.latitude!, point.longitude!))
        .toList();

    return FlutterMap(
      options: MapOptions(
        initialCenter: center,
        initialZoom: 13,
        initialCameraFit: bounds.length > 1
            ? CameraFit.bounds(
                bounds: LatLngBounds.fromPoints(bounds),
                padding: const EdgeInsets.all(44),
              )
            : null,
        minZoom: 3,
        maxZoom: 19,
      ),
      children: [
        TileLayer(
          urlTemplate: _tilesUrl,
          userAgentPackageName: 'online.navaagencian8n.mais1km',
          maxZoom: 19,
        ),
        MarkerLayer(
          markers: geolocated.map((point) {
            return Marker(
              point: LatLng(point.latitude!, point.longitude!),
              width: 40,
              height: 44,
              child: Semantics(
                button: true,
                label: 'Abrir ${point.name}',
                child: GestureDetector(
                  onTap: () => onSelectPoint(point),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: BrandPalette.darkSurface,
                          shape: BoxShape.circle,
                          border: Border.all(color: BrandPalette.gold, width: 1.3),
                          boxShadow: const [
                            BoxShadow(color: Color(0x99000000), blurRadius: 8, offset: Offset(0, 3)),
                          ],
                        ),
                        child: Icon(
                          _categoryIcon(point.categories.isEmpty ? '' : point.categories.first),
                          color: BrandPalette.gold,
                          size: 17,
                        ),
                      ),
                      const Icon(Icons.arrow_drop_down, color: BrandPalette.gold, size: 12),
                    ],
                  ),
                ),
              ),
            );
          }).toList(),
        ),
        const RichAttributionWidget(
          attributions: [
            TextSourceAttribution('© OpenStreetMap contributors'),
          ],
        ),
      ],
    );
  }
}

IconData _categoryIcon(String category) => switch (category.toLowerCase()) {
      'natureza' => Icons.eco_outlined,
      'historia' || 'história' => Icons.account_balance_outlined,
      'cultura' => Icons.music_note_outlined,
      'trabalho' => Icons.agriculture_outlined,
      'litoral' => Icons.waves_outlined,
      'misterio' || 'mistério' => Icons.auto_awesome_outlined,
      _ => Icons.place_outlined,
    };
