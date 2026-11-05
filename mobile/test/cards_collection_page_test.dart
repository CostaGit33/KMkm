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

    await tester.tap(find.text('Natureza · 0/1'));
    await tester.pumpAndSettle();
    expect(find.text('Carta bloqueada'), findsOneWidget);
    expect(find.text('Guardião da Praça'), findsNothing);
  });

  testWidgets('não revela arte nem raridade na grade de cartas bloqueadas', (tester) async {
    final data = NotebookSnapshot.fromJson({
      'colecao': {
        'total': 1,
        'capturadas': 0,
        'por_categoria': {'natureza': {'total': 1, 'capturadas': 0}},
        'itens': [
          {
            'codigo': 'eu-locked',
            'carta': 9,
            'ponto': 'Ponto reservado',
            'categoria': 'natureza',
            'raridade': 'lendario',
            'capturada': false,
            'arte': 'arte-secreta.webp',
            'arte_foto': {'m': '/midia/arte-secreta.m.webp', 'g': '/midia/arte-secreta.g.webp'},
          },
        ],
      },
    });
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: CardsCollectionPage(snapshot: data, onOpenPoint: (_) {})),
    ));

    expect(find.text('Carta bloqueada'), findsOneWidget);
    expect(find.text('Lendária'), findsNothing);
    expect(find.byType(Image), findsNothing);
  });

  testWidgets('abre detalhe com história, frase e metadados da carta', (tester) async {
    tester.view.physicalSize = const Size(800, 1200);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: CardsCollectionPage(snapshot: fixture(), onOpenPoint: (_) {})),
    ));

    await tester.tap(find.text('Guardião da Praça'));
    await tester.pumpAndSettle();

    expect(find.text('Rara'), findsWidgets);
        expect(find.text('HISTÓRIA'), findsOneWidget);
    expect(find.text('Uma história da cidade.'), findsOneWidget);
        expect(find.text('“Cada caminho conta.”'), findsOneWidget);
        expect(find.text('Ver ponto no mapa'), findsOneWidget);
  });
}
