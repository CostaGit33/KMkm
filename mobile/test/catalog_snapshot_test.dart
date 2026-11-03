import 'package:flutter_test/flutter_test.dart';
import 'package:mais1km/core/models/catalog_snapshot.dart';

void main() {
  test('mostra somente pontos publicados e não ocultos', () {
    final catalog = CatalogSnapshot.fromJson({
      'pontos': [
        {
          'codigo': 'centro-historico',
          'nome': 'Centro Histórico',
          'status': 'publicado',
          'oculto': false,
          'categorias': ['historia', 'cultura'],
          'lat': -16.37,
          'lng': -39.58,
        },
        {
          'codigo': 'rascunho',
          'nome': 'Ponto em revisão',
          'status': 'pendente',
          'oculto': false,
        },
        {
          'codigo': 'oculto',
          'nome': 'Ponto oculto',
          'status': 'publicado',
          'oculto': true,
        },
      ],
      'circuitos': [
        {
          'slug': 'centro',
          'nome': 'Circuito do Centro',
          'codigos': ['centro-historico'],
        },
      ],
    });

    expect(catalog.points, hasLength(1));
    expect(catalog.points.single.code, 'centro-historico');
    expect(catalog.points.single.categories, ['historia', 'cultura']);
    expect(catalog.circuits.single.slug, 'centro');
  });

  test('aceita catálogo vazio sem falhar', () {
    final catalog = CatalogSnapshot.fromJson({});
    expect(catalog.points, isEmpty);
    expect(catalog.circuits, isEmpty);
  });
}
