import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mais1km/core/models/catalog_snapshot.dart';
import 'package:mais1km/features/map/catalog_map.dart';

void main() {
  group('CatalogMap', () {
    testWidgets('usa OSM por padrão quando Google Maps não foi habilitado',
        (tester) async {
      CatalogPoint? selected;
      const point = CatalogPoint(
        code: 'p-1',
        name: 'Praça Central',
        categories: ['Cultura'],
        latitude: -23.55,
        longitude: -46.63,
      );

      await tester.pumpWidget(
        MaterialApp(
          home: SizedBox(
            width: 400,
            height: 600,
            child: CatalogMap(
              points: const [point],
              onSelectPoint: (value) => selected = value,
            ),
          ),
        ),
      );

      expect(find.byType(FlutterMap), findsOneWidget);
      expect(find.byType(TileLayer), findsOneWidget);
      expect(find.byType(MarkerLayer), findsOneWidget);
      expect(
        tester.widget<MarkerLayer>(find.byType(MarkerLayer)).markers,
        hasLength(1),
      );

      final marker = find.bySemanticsLabel('Abrir Praça Central');
      expect(marker, findsOneWidget);
      await tester.tap(marker);
      expect(selected, same(point));
    });

    testWidgets('omite pontos sem coordenadas válidas', (tester) async {
      const validPoint = CatalogPoint(
        code: 'valid',
        name: 'Ponto válido',
        categories: [],
        latitude: 0,
        longitude: 0,
      );
      const invalidPoints = [
        CatalogPoint(
          code: 'missing',
          name: 'Sem coordenadas',
          categories: [],
        ),
        CatalogPoint(
          code: 'latitude-out-of-range',
          name: 'Latitude inválida',
          categories: [],
          latitude: 91,
          longitude: 0,
        ),
        CatalogPoint(
          code: 'longitude-out-of-range',
          name: 'Longitude inválida',
          categories: [],
          latitude: 0,
          longitude: 181,
        ),
        CatalogPoint(
          code: 'not-finite',
          name: 'Coordenada não finita',
          categories: [],
          latitude: double.nan,
          longitude: 0,
        ),
      ];

      await tester.pumpWidget(
        MaterialApp(
          home: SizedBox(
            width: 400,
            height: 600,
            child: CatalogMap(
              points: [validPoint, ...invalidPoints],
              onSelectPoint: (_) {},
            ),
          ),
        ),
      );

      expect(
        tester.widget<MarkerLayer>(find.byType(MarkerLayer)).markers,
        hasLength(1),
      );
      expect(find.bySemanticsLabel('Abrir Latitude inválida'), findsNothing);
    });

    testWidgets('mostra estado vazio quando não há coordenadas válidas',
        (tester) async {
      const point = CatalogPoint(
        code: 'invalid',
        name: 'Ponto inválido',
        categories: [],
        latitude: 100,
        longitude: 0,
      );

      await tester.pumpWidget(
        MaterialApp(
          home: CatalogMap(points: const [point], onSelectPoint: (_) {}),
        ),
      );

      expect(find.byType(FlutterMap), findsNothing);
      expect(
        find.text('Ainda não há pontos publicados com coordenadas válidas.'),
        findsOneWidget,
      );
    });
  });
}
