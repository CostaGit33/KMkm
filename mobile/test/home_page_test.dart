import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mais1km/core/theme/brand_theme.dart';
import 'package:mais1km/features/notebook/notebook_pages.dart';
import 'package:mais1km/core/models/notebook_snapshot.dart';

void main() {
  NotebookSnapshot sampleSnapshot() => NotebookSnapshot.fromJson({
        'usuario': {'apelido': 'Explorador'},
        'rotas': [
          {
            'id': 7,
            'nome': 'Circuito Cultural',
            'status': 'publicado',
            'km': 2.4,
            'pontos': [
              {
                'codigo': 'eu-001',
                'tag_nome': 'Praça da Bandeira',
                'ordem': 1,
                'status': 'publicado',
                'carimbo': {
                  'criado_em': '2026-10-01T12:00:00.000Z',
                },
              },
              {
                'codigo': 'eu-002',
                'tag_nome': 'Praça da Liberdade',
                'ordem': 2,
                'status': 'publicado',
                'carimbo': null,
              },
            ],
          },
        ],
        'eventos': [
          {
            'slug': 'evento-ativo',
            'nome': 'Festival da Cidade',
            'tipo': 'evento',
            'estado': 'ao_vivo',
            'feitos': 1,
            'total': 3,
            'pontos': [],
          },
          {
            'slug': 'evento-encerrado',
            'nome': 'Evento encerrado',
            'tipo': 'evento',
            'estado': 'encerrado',
            'feitos': 3,
            'total': 3,
            'pontos': [],
          },
        ],
        'colecao': {
          'total': 2,
          'capturadas': 1,
          'por_categoria': {
            'cultura': {'total': 2, 'capturadas': 1},
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
              'capturada_em': '2026-10-01T12:00:00.000Z',
            },
            {
              'codigo': 'eu-002',
              'carta': 2,
              'ponto': 'Praça da Liberdade',
              'categoria': 'cultura',
              'raridade': 'raro',
              'capturada': false,
            },
          ],
        },
      });

  Future<void> pumpHome(
    WidgetTester tester, {
    VoidCallback? onMap,
    VoidCallback? onStamp,
    VoidCallback? onCollection,
    VoidCallback? onRoutes,
    ValueChanged<String>? onPoint,
    Future<void> Function()? onNearby,
    bool showingStaleData = false,
  }) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: Mais1kmTheme.dark,
        home: Scaffold(
          body: NotebookPages(
            page: 0,
            snapshot: sampleSnapshot(),
            user: const {'nome': 'Romulo Costa'},
            onOpenMap: onMap ?? () {},
            onOpenStamp: onStamp,
            onOpenRoutes: onRoutes,
            onOpenCollection: onCollection ?? () {},
            onOpenPoint: onPoint ?? (_) {},
            onFindNearby: onNearby,
            showingStaleData: showingStaleData,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('mostra painel, progresso e próxima descoberta reais', (tester) async {
    await pumpHome(tester);

    expect(find.text('Olá, Romulo.'), findsOneWidget);
    expect(find.text('1 de 2 cartas'), findsOneWidget);

    await tester.scrollUntilVisible(
      find.text('Circuito Cultural'),
      260,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Praça da Liberdade'), findsOneWidget);

    await tester.scrollUntilVisible(
      find.text('Festival da Cidade'),
      260,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Evento encerrado'), findsNothing);
  });

  testWidgets('atalhos do mapa e leitura NFC executam suas ações', (tester) async {
    var mapOpened = false;
    var stampOpened = false;

    await pumpHome(
      tester,
      onMap: () => mapOpened = true,
      onStamp: () => stampOpened = true,
    );

    await tester.tap(find.text('Explorar mapa'));
    await tester.pump();
    expect(mapOpened, isTrue);

    await tester.tap(find.text('Ler TAG'));
    await tester.pump();
    expect(stampOpened, isTrue);
  });

  testWidgets('abre os detalhes do próximo ponto selecionado', (tester) async {
    String? openedCode;

    await pumpHome(tester, onPoint: (code) => openedCode = code);

    await tester.drag(find.byType(ListView).first, const Offset(0, -320));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Detalhes do ponto'));
    await tester.tap(find.text('Detalhes do ponto'));
    await tester.pump();

    expect(openedCode, 'eu-002');
    expect(find.byType(RefreshIndicator), findsNothing);
  });

  testWidgets('mostra atividade recente confirmada e aviso quando usa dados antigos', (tester) async {
    await pumpHome(tester, showingStaleData: true);

    expect(find.textContaining('Sem conexão.'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('Sua atividade'),
      260,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Sua atividade'), findsOneWidget);
    expect(find.textContaining('Carimbo confirmado'), findsOneWidget);
    expect(find.textContaining('01/10/2026'), findsOneWidget);
  });

  testWidgets('atalho de descobertas próximas dispara apenas a ação solicitada', (tester) async {
    var requested = false;
    await pumpHome(tester, onNearby: () async { requested = true; });

    await tester.tap(find.byTooltip('Encontrar pontos próximos'));
    await tester.pump();
    expect(requested, isTrue);
  });

  testWidgets('adapta o painel a uma largura estreita sem overflow', (tester) async {
    tester.view.physicalSize = const Size(320, 720);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await pumpHome(tester);

    final exception = tester.takeException();
    if (exception is FlutterError) {
      for (final diagnostic in exception.diagnostics) {
        debugPrint(diagnostic.toStringDeep());
      }
    }
    expect(exception, isNull);
    expect(find.text('Explorar mapa'), findsOneWidget);
    expect(find.text('Ler TAG'), findsOneWidget);
  });
}
