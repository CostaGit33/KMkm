import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mais1km/features/profile/profile_page.dart';

void useTallViewport(WidgetTester tester) {
  tester.view.physicalSize = const Size(800, 1800);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

void main() {
  Widget mount({
    required ProfileSaveCallback onSave,
    required ProfileActionCallback onDelete,
    required ProfileActionCallback onLogout,
  }) => MaterialApp(
        home: ProfilePage(
          user: const {'nome': 'Ana Silva', 'email': 'ana@example.com'},
          onSaveAccount: onSave,
          onDeleteAccount: onDelete,
          onLogout: onLogout,
        ),
      );

  testWidgets('abre Perfil como uma rota completa com título e retorno', (tester) async {
    useTallViewport(tester);
    await tester.pumpWidget(MaterialApp(
      home: Builder(
        builder: (context) => Scaffold(
          body: Center(
            child: TextButton(
              onPressed: () => Navigator.of(context).push<void>(
                MaterialPageRoute<void>(
                  builder: (_) => ProfilePage(
                    user: const {'nome': 'Ana Silva', 'email': 'ana@example.com'},
                    onSaveAccount: ({required nome, required email, required senhaAtual, required senhaNova}) async {},
                    onDeleteAccount: () async {},
                    onLogout: () async {},
                  ),
                ),
              ),
              child: const Text('Abrir perfil'),
            ),
          ),
        ),
      ),
    ));

    await tester.tap(find.text('Abrir perfil'));
    await tester.pumpAndSettle();
    expect(find.text('Meu perfil'), findsOneWidget);
    expect(find.byType(AppBar), findsOneWidget);
    expect(find.byIcon(Icons.arrow_back), findsOneWidget);

    await tester.tap(find.byIcon(Icons.arrow_back));
    await tester.pumpAndSettle();
    expect(find.text('Abrir perfil'), findsOneWidget);
  });

  testWidgets('valida campos e envia dados normalizados no callback', (tester) async {
    useTallViewport(tester);
    Map<String, String>? received;
    await tester.pumpWidget(mount(
      onSave: ({required nome, required email, required senhaAtual, required senhaNova}) async {
        received = {'nome': nome, 'email': email, 'senhaAtual': senhaAtual, 'senhaNova': senhaNova};
      },
      onDelete: () async {},
      onLogout: () async {},
    ));
    await tester.enterText(find.byType(TextFormField).at(0), 'Ana Lima');
    await tester.enterText(find.byType(TextFormField).at(1), 'ana.lima@example.com');
    await tester.ensureVisible(find.byType(TextFormField).at(2));
    await tester.enterText(find.byType(TextFormField).at(2), 'senha-atual');
    await tester.ensureVisible(find.text('Salvar dados'));
    await tester.tap(find.text('Salvar dados'));
    await tester.pump();

    expect(received, {
      'nome': 'Ana Lima',
      'email': 'ana.lima@example.com',
      'senhaAtual': 'senha-atual',
      'senhaNova': '',
    });
    expect(find.text('Dados da conta salvos com sucesso.'), findsOneWidget);
  });

  testWidgets('bloqueia senha nova quando a confirmação não coincide', (tester) async {
    useTallViewport(tester);
    var saveCalls = 0;
    await tester.pumpWidget(mount(
      onSave: ({required nome, required email, required senhaAtual, required senhaNova}) async {
        saveCalls++;
      },
      onDelete: () async {},
      onLogout: () async {},
    ));

    await tester.enterText(find.byType(TextFormField).at(2), 'senha-atual');
    await tester.enterText(find.byType(TextFormField).at(3), 'nova-senha-segura');
    await tester.enterText(find.byType(TextFormField).at(4), 'senha-diferente');
    await tester.ensureVisible(find.text('Salvar dados'));
    await tester.tap(find.text('Salvar dados'));
    await tester.pumpAndSettle();

    expect(find.text('As novas senhas não são iguais.'), findsOneWidget);
    expect(saveCalls, 0);
  });

  testWidgets('não conclui exclusão sem confirmação nem sucesso do callback', (tester) async {
    useTallViewport(tester);
    var deleteCalls = 0;
    await tester.pumpWidget(mount(
      onSave: ({required nome, required email, required senhaAtual, required senhaNova}) async {},
      onDelete: () async {
        deleteCalls++;
        throw Exception('Falha do servidor');
      },
      onLogout: () async {},
    ));

    await tester.scrollUntilVisible(
      find.text('Excluir conta e dados'),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.text('Excluir conta e dados'));
    await tester.pumpAndSettle();
    expect(find.text('A solicitação de exclusão foi concluída.'), findsNothing);
    expect(deleteCalls, 0);

    await tester.tap(find.text('Confirmar exclusão'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(deleteCalls, 1);
    expect(find.text('Falha do servidor'), findsOneWidget);
    expect(find.text('A solicitação de exclusão foi concluída.'), findsNothing);
  });

  testWidgets('cancelar confirmação não chama exclusão', (tester) async {
    useTallViewport(tester);
    var deleteCalls = 0;
    await tester.pumpWidget(mount(
      onSave: ({required nome, required email, required senhaAtual, required senhaNova}) async {},
      onDelete: () async {
        deleteCalls++;
      },
      onLogout: () async {},
    ));
    await tester.scrollUntilVisible(
      find.text('Excluir conta e dados'),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.text('Excluir conta e dados'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Cancelar'));
    await tester.pumpAndSettle();
    expect(deleteCalls, 0);
    expect(find.text('A solicitação de exclusão foi concluída.'), findsNothing);
  });
}
