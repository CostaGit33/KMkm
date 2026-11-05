import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mais1km/core/models/notebook_snapshot.dart';
import 'package:mais1km/features/notebook/cards_collection_page.dart';

NotebookSnapshot fixture() => NotebookSnapshot.fromJson({
  'rotas': [
    {'id': 1, 'nome': 'Circuito Cultural', 'status': 'publicado', 'pontos': [
      {'codigo': 'eu-001', 'tag_nome': 'Praça da Bandeira', 'ordem': 1, 'status': 'publicado',
        'carimbo': {'criado_em': '2026-10-01T12:00:00.000Z'}},
    ]},
  ],
  'eventos': [],
  'colecao': {
    'total': 2,
    'capturadas': 1,
    'por_categoria': {
      'cultura': {'total': 1, 'capturadas': 1},
      'natureza': {'total': 1, 'capturadas': 0},
    },
    'itens': [
      {'codigo': 'eu-001', 'carta': 1, 'ponto': 'Praça da Bandeira', 'categoria': 'cultura',
        'raridade': 'raro', 'capturada': true, 'criatura': 'Guardião da Praça',
        'frase': 'Cada caminho conta.', 'historia': 'Uma história da cidade.',
        'capturada_em': '2026-10-01T12:00:00.000Z'},
      {'codigo': 'eu-002', 'carta': 2, 'ponto': 'Parque do Gravatá', 'categoria': 'natureza',
        'raridade': 'lendario', 'capturada': false},
    ],
  },
});

void main() {
  testWidgets('mostra coleção, progresso, categorias e cartas bloqueadas', (tester) async {
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: CardsCollectionPage(snapshot: fixture(), onOpenPoint: (_) {})),
    ));

    expect(find.text('Sua coleção'), findsOneWidget);
    expect(find.text('1/2'), findsOneWidget);
    expect(find.text('Conquistadas · 1'), findsOneWidget);
    expect(find.text('Bloqueadas · 1'), findsOneWidget);
    expect(find.text('Guardião da Praça'), findsOneWidget);
    expect(find.text('Carta bloqueada'), findsOneWidget);

    await tester.tap(find.text('Natureza · 1'));
    await tester.pumpAndSettle();
    expect(find.text('Carta bloqueada'), findsOneWidget);
    expect(find.text('Guardião da Praça'), findsNothing);
  });

  testWidgets('abre detalhe com história, frase e metadados da carta', (tester) async {
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: CardsCollectionPage(snapshot: fixture(), onOpenPoint: (_) {})),
    ));

    await tester.scrollUntilVisible(find.text('Guardião da Praça'), 240);
    await tester.tap(find.text('Guardião da Praça'));
    await tester.pumpAndSettle();

    expect(find.text('Rara'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('HISTÓRIA'), 160, scrollable: find.byType(Scrollable).last);
    expect(find.text('HISTÓRIA'), findsOneWidget);
    expect(find.text('Uma história da cidade.'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('“Cada caminho conta.”'), 120, scrollable: find.byType(Scrollable).last);
    expect(find.text('“Cada caminho conta.”'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Ver ponto no mapa'), 120, scrollable: find.byType(Scrollable).last);
    expect(find.text('Ver ponto no mapa'), findsOneWidget);
  });
}
