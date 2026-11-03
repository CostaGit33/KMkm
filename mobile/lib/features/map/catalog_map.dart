import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../../core/models/catalog_snapshot.dart';

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

    return FlutterMap(
      options: MapOptions(
        initialCenter: center,
        initialZoom: 13,
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
              width: 48,
              height: 54,
              child: Semantics(
                button: true,
                label: 'Abrir ${point.name}',
                child: GestureDetector(
                  onTap: () => onSelectPoint(point),
                  child: const Icon(
                    Icons.location_on,
                    color: Color(0xFF173D2E),
                    size: 42,
                    shadows: [
                      Shadow(
                        color: Colors.white,
                        blurRadius: 5,
                        offset: Offset(0, 1),
                      ),
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
