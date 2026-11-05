import 'package:flutter_test/flutter_test.dart';
import 'package:mais1km/core/models/notebook_snapshot.dart';

void main() {
  test('interpreta rotas e carimbos a partir da caderneta do servidor', () {
    final notebook = NotebookSnapshot.fromJson({
      'usuario': {'apelido': 'Explorador'},
      'rotas': [
        {
          'id': 7,
          'nome': 'Circuito Cultural',
          'cor': 'ochre',
          'km': 2.4,
          'status': 'publicado',
          'pontos': [
            {
              'codigo': 'eu-001',
              'tag_nome': 'Praça da Bandeira',
              'ordem': 1,
              'status': 'publicado',
              'carimbo': {'criado_em': '2026-10-01T12:00:00.000Z'}
            },
            {
              'codigo': 'eu-002',
              'tag_nome': 'Praça da Liberdade',
              'ordem': 2,
              'status': 'publicado',
              'carimbo': null
            }
          ]
        }
      ],
      'eventos': [],
      'colecao': {
        'total': 2,
        'capturadas': 1,
        'por_categoria': {
          'cultura': {'total': 2, 'capturadas': 1}
        },
        'itens': [
          {
            'codigo': 'eu-001',
            'carta': 1,
            'ponto': 'Praça da Bandeira',
            'categoria': 'cultura',
            'raridade': 'comum',
            'capturada': true,
            'criatura': 'Guardião da Praça',
            'frase': 'Cada caminho conta.',
            'capturada_em': '2026-10-01T12:00:00.000Z',
            'arte_foto': {'m': '/midia/thumb.webp', 'g': '/midia/full.webp'},
            'historia': 'História do ponto.'
          },
          {
            'codigo': 'eu-002',
            'carta': 2,
            'ponto': 'Praça da Liberdade',
            'categoria': 'cultura',
            'raridade': 'raro',
            'capturada': false,
            'criatura': null
          }
        ]
      }
    });

    expect(notebook.alias, 'Explorador');
    expect(notebook.routes, hasLength(1));
    expect(notebook.routes.single.completed, 1);
    expect(notebook.routes.single.remaining, 1);
    expect(notebook.routes.single.isComplete, isFalse);
    expect(notebook.totalCards, 2);
    expect(notebook.capturedCards, 1);
    expect(notebook.cards.first.creature, 'Guardião da Praça');
    expect(notebook.cards.first.artThumbnail, '/midia/thumb.webp');
    expect(notebook.cards.first.artLarge, '/midia/full.webp');
    expect(notebook.cards.first.story, 'História do ponto.');
    expect(notebook.cards.last.captured, isFalse);
    expect(notebook.categories['cultura']?['total'], 2);
  });

  test('aceita caderneta vazia sem criar progresso fictício', () {
    final notebook = NotebookSnapshot.fromJson({});
    expect(notebook.routes, isEmpty);
    expect(notebook.cards, isEmpty);
    expect(notebook.totalCards, 0);
    expect(notebook.capturedCards, 0);
    expect(notebook.progress, 0);
  });
}
