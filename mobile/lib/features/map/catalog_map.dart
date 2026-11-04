import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart' as google_maps;
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
  static const _googleMapsEnabled =
      bool.fromEnvironment('GOOGLE_MAPS_ENABLED');
  static const _googleMapsKeyConfigured =
      bool.fromEnvironment('MAPS_API_KEY_CONFIGURED');
  static const _googleMapId = String.fromEnvironment('GOOGLE_MAP_ID');

  @override
  Widget build(BuildContext context) {
    final geolocated = points.where(_hasValidCoordinates).toList();

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

    final useGoogleMaps = _googleMapsEnabled &&
        _googleMapsKeyConfigured &&
        defaultTargetPlatform == TargetPlatform.android;
    if (useGoogleMaps) {
      return _buildGoogleMap(geolocated);
    }
    return _buildOsmMap(geolocated);
  }

  Widget _buildOsmMap(List<CatalogPoint> geolocated) {
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
          userAgentPackageName: 'online.novaagencian8n.mais1km',
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
                            BoxShadow(
                              color: Color(0x99000000),
                              blurRadius: 8,
                              offset: Offset(0, 3),
                            ),
                          ],
                        ),
                        child: Icon(
                          _categoryIcon(
                            point.categories.isEmpty
                                ? ''
                                : point.categories.first,
                          ),
                          color: BrandPalette.gold,
                          size: 17,
                        ),
                      ),
                      const Icon(
                        Icons.arrow_drop_down,
                        color: BrandPalette.gold,
                        size: 12,
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

  Widget _buildGoogleMap(List<CatalogPoint> geolocated) {
    final coordinates = geolocated
        .map((point) =>
            google_maps.LatLng(point.latitude!, point.longitude!))
        .toList();
    final initialPosition = google_maps.CameraPosition(
      target: coordinates.first,
      zoom: 13,
    );
    final shouldFitBounds = _hasDistinctCoordinates(coordinates);

    return google_maps.GoogleMap(
      initialCameraPosition: initialPosition,
      mapId: _googleMapId.isEmpty ? null : _googleMapId,
      mapTypeControlEnabled: true,
      streetViewControlEnabled: true,
      mapToolbarEnabled: true,
      minMaxZoomPreference: const google_maps.MinMaxZoomPreference(3, 19),
      markers: {
        for (var index = 0; index < geolocated.length; index++)
          google_maps.Marker(
            markerId: google_maps.MarkerId(
              '${geolocated[index].code}-$index',
            ),
            position: coordinates[index],
            infoWindow: google_maps.InfoWindow(title: geolocated[index].name),
            onTap: () => onSelectPoint(geolocated[index]),
          ),
      },
      onMapCreated: shouldFitBounds
          ? (controller) => controller.animateCamera(
                google_maps.CameraUpdate.newLatLngBounds(
                  _boundsFor(coordinates),
                  44,
                ),
              )
          : null,
    );
  }

  static bool _hasDistinctCoordinates(List<google_maps.LatLng> points) {
    if (points.length < 2) return false;
    final first = points.first;
    return points.skip(1).any((point) =>
        point.latitude != first.latitude ||
        point.longitude != first.longitude);
  }

  static google_maps.LatLngBounds _boundsFor(
    List<google_maps.LatLng> coordinates,
  ) {
    var south = coordinates.first.latitude;
    var north = south;
    var west = coordinates.first.longitude;
    var east = west;
    for (final point in coordinates.skip(1)) {
      if (point.latitude < south) south = point.latitude;
      if (point.latitude > north) north = point.latitude;
      if (point.longitude < west) west = point.longitude;
      if (point.longitude > east) east = point.longitude;
    }
    return google_maps.LatLngBounds(
      southwest: google_maps.LatLng(south, west),
      northeast: google_maps.LatLng(north, east),
    );
  }
}

bool _hasValidCoordinates(CatalogPoint point) {
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
