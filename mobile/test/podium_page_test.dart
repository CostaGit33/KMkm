import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mais1km/features/gamification/podium_page.dart';

void main() {
  Widget mount({
    Map<String, dynamic>? podium,
    Map<String, dynamic>? gamification,
    bool loading = false,
    String? error,
    VoidCallback? onRefresh,
    PodiumParticipationCallback? onSave,
  }) => MaterialApp(
        home: Scaffold(
          body: PodiumPage(
            podiumData: podium,
            gamificationData: gamification,
            loading: loading,
            error: error,
            onRefresh: onRefresh ?? () {},
            onSaveParticipation: onSave ?? ({required optIn, required alias}) async {},
          ),
        ),
      );

  testWidgets('mostra indicador de carregamento quando ainda não há dados', (tester) async {
    await tester.pumpWidget(mount(loading: true));
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });

  testWidgets('mostra falha e oferece nova tentativa sem dados', (tester) async {
    var refreshCalls = 0;
    await tester.pumpWidget(mount(error: 'Sem conexão', onRefresh: () => refreshCalls++));
    expect(find.text('Não foi possível carregar o pódio'), findsOneWidget);
    expect(find.text('Sem conexão'), findsOneWidget);
    await tester.tap(find.text('Tentar novamente'));
    expect(refreshCalls, 1);
  });

  testWidgets('renderiza XP, conquistas e participantes do JSON', (tester) async {
    await tester.pumpWidget(mount(
      podium: {
        'scope': 'geral',
        'period': {'label': 'Geral'},
        'board': [
          {'rank': 1, 'alias': 'Bia', 'xp': 120, 'uniquePoints': 8, 'isMe': false},
          {'rank': 2, 'alias': 'Caio', 'xp': 90, 'uniquePoints': 6, 'isMe': true},
        ],
        'me': {'optedIn': true, 'alias': 'Caio', 'xp': 90},
      },
      gamification: {
        'xp': {
          'total': 90,
          'uniquePoints': 6,
          'completedRoutes': 1,
          'level': {
            'current': {'level': 2, 'name': 'Descobridor'},
            'progress': 0.4,
          },
        },
        'participation': {'optedIn': true, 'alias': 'Caio'},
        'medals': [
          {'name': 'Primeiro carimbo', 'earned': true, 'icon': '✦', 'progress': {'current': 1, 'target': 1}},
        ],
      },
    ));
    expect(find.text('90 XP'), findsNWidgets(2));
    expect(find.text('Descobridor'), findsOneWidget);
    expect(find.text('Bia'), findsOneWidget);
    expect(find.text('Caio · você'), findsOneWidget);
    expect(find.text('Primeiro carimbo'), findsOneWidget);
  });

  testWidgets('valida apelido e salva preferência opt-in via callback', (tester) async {
    Map<String, Object?>? saved;
    await tester.pumpWidget(mount(
      podium: {'board': [], 'me': {'optedIn': false, 'alias': ''}},
      gamification: {'participation': {'optedIn': false, 'alias': ''}},
      onSave: ({required optIn, required alias}) async {
        saved = {'optIn': optIn, 'alias': alias};
      },
    ));

    await tester.scrollUntilVisible(
      find.text('Participar do pódio público'),
      250,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.text('Participar do pódio público'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('Salvar preferência'),
      250,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.text('Salvar preferência'));
    await tester.pump();
    expect(find.text('Informe um apelido público de 2 a 30 caracteres, sem e-mail.'), findsOneWidget);
    expect(saved, isNull);

    await tester.ensureVisible(find.byType(TextField).first);
    await tester.enterText(find.byType(TextField).first, '  Nina   Luz ');
    await tester.ensureVisible(find.text('Salvar preferência'));
    await tester.tap(find.text('Salvar preferência'));
    await tester.pump();
    expect(saved, {'optIn': true, 'alias': 'Nina Luz'});
    expect(find.text('Sua preferência de participação foi salva.'), findsOneWidget);
  });
}
