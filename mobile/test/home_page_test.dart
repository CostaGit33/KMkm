import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mais1km/core/models/notebook_snapshot.dart';
import 'package:mais1km/features/notebook/notebook_pages.dart';

void main() {
  testWidgets('Home apresenta ações principais e abre leitura de TAG', (tester) async {
    var openedStamp = false;
    var openedMap = false;
    final snapshot = NotebookSnapshot(
      routes: const [],
      cards: const [],
      events: const [],
      totalCards: 12,
      capturedCards: 2,
      categories: const {},
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData.dark(),
        home: Scaffold(
          body: NotebookPages(
            page: 0,
            snapshot: snapshot,
            user: const {'nome': 'Romulo Costa'},
            onOpenMap: () => openedMap = true,
            onOpenCollection: () {},
            onOpenPoint: (_) {},
            onOpenStamp: () => openedStamp = true,
          ),
        ),
      ),
    );

    expect(find.text('Acesso rápido'), findsOneWidget);
    expect(find.text('Ler TAG'), findsOneWidget);
    expect(find.text('Explorar'), findsOneWidget);
    expect(find.text('Coleção'), findsOneWidget);
    expect(find.textContaining('Romulo'), findsOneWidget);

    await tester.tap(find.text('Ler TAG'));
    expect(openedStamp, isTrue);
    await tester.tap(find.text('Explorar').first);
    expect(openedMap, isTrue);
  });

  testWidgets('Home não informa conclusão quando ainda não existem rotas', (tester) async {
    final snapshot = NotebookSnapshot(
      routes: const [],
      cards: const [],
      events: const [],
      totalCards: 0,
      capturedCards: 0,
      categories: const {},
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData.dark(),
        home: Scaffold(
          body: NotebookPages(
            page: 0,
            snapshot: snapshot,
            user: const {},
            onOpenMap: () {},
            onOpenCollection: () {},
            onOpenPoint: (_) {},
          ),
        ),
      ),
    );

    expect(find.textContaining('As rotas publicadas aparecerão aqui'), findsOneWidget);
    expect(find.textContaining('Você concluiu todos os pontos'), findsNothing);
  });
}
