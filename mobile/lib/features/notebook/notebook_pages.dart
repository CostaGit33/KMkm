import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/models/notebook_snapshot.dart';
import '../../core/theme/brand_theme.dart';

class NotebookPages extends StatelessWidget {
  const NotebookPages({
    super.key,
    required this.page,
    required this.snapshot,
    required this.user,
    required this.onOpenMap,
    required this.onOpenCollection,
    required this.onOpenPoint,
    this.onOpenStamp,
    this.onOpenRoutes,
    this.onRefresh,
    this.onFindNearby,
    this.showingStaleData = false,
    this.loading = false,
    this.error,
    this.onRetry,
  });

  final int page;
  final NotebookSnapshot? snapshot;
  final Map<String, dynamic> user;
  final VoidCallback onOpenMap;
  final VoidCallback onOpenCollection;
  final ValueChanged<String> onOpenPoint;
  final VoidCallback? onOpenStamp;
  final VoidCallback? onOpenRoutes;
  final Future<void> Function()? onRefresh;
  final Future<void> Function()? onFindNearby;
  final bool showingStaleData;
  final bool loading;
  final String? error;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    if (loading && snapshot == null) {
      return const Center(child: CircularProgressIndicator(color: _C.forest));
    }
    if (error != null && snapshot == null) {
      return _LoadError(message: error!, onRetry: onRetry);
    }
    final data = snapshot;
    if (data == null) {
      return const Center(child: Text('A caderneta ainda não foi carregada.'));
    }
    if (page == 2) {
      return _RoutesPage(snapshot: data, onOpenPoint: onOpenPoint);
    }
    if (page == 3) {
      return _CollectionPage(snapshot: data, onOpenPoint: onOpenPoint);
    }
    return _HomePage(
      snapshot: data,
      user: user,
      onOpenMap: onOpenMap,
      onOpenCollection: onOpenCollection,
      onOpenPoint: onOpenPoint,
      onOpenStamp: onOpenStamp,
      onOpenRoutes: onOpenRoutes,
      onRefresh: onRefresh,
      onFindNearby: onFindNearby,
      showingStaleData: showingStaleData,
    );
  }
}

class _C {
  static const forest = BrandPalette.forest;
  static const gold = BrandPalette.gold;
  static const cream = BrandPalette.darkCardStrong;
  static const paper = BrandPalette.darkCard;
  static const ink = BrandPalette.cream;
  static const muted = BrandPalette.darkMuted;
  static const border = BrandPalette.darkRule;
}

class _HomePage extends StatelessWidget {
  const _HomePage({
    required this.snapshot,
    required this.user,
    required this.onOpenMap,
    required this.onOpenCollection,
    required this.onOpenPoint,
    this.onOpenStamp,
    this.onOpenRoutes,
    this.onRefresh,
    this.onFindNearby,
    this.showingStaleData = false,
  });

  final NotebookSnapshot snapshot;
  final Map<String, dynamic> user;
  final VoidCallback onOpenMap;
  final VoidCallback onOpenCollection;
  final ValueChanged<String> onOpenPoint;
  final VoidCallback? onOpenStamp;
  final VoidCallback? onOpenRoutes;
  final Future<void> Function()? onRefresh;
  final Future<void> Function()? onFindNearby;
  final bool showingStaleData;

  @override
  Widget build(BuildContext context) {
    final rawName = (user['nome'] ?? snapshot.alias ?? 'Viajante').toString().trim();
    final firstName = rawName.isEmpty ? 'Viajante' : rawName.split(' ').first;
    final recent = snapshot.cards.where((card) => card.captured).toList()
      ..sort((a, b) => (b.capturedAt ?? DateTime(1970))
          .compareTo(a.capturedAt ?? DateTime(1970)));
    final routes = snapshot.routes.where((route) => !route.isComplete && route.total > 0).toList()
      ..sort((a, b) => (b.completed > 0 ? 1 : 0).compareTo(a.completed > 0 ? 1 : 0));
    final route = routes.isEmpty ? null : routes.first;
    final pending = route?.points.where((point) => point.published && !point.completed).toList()
        ?? const <NotebookRoutePoint>[];
    final next = pending.isEmpty ? null : pending.first;
    final events = snapshot.events
        .where((event) => event.state == 'ao_vivo' || event.state == 'em_breve')
        .take(3)
        .toList();
    final activityByCode = <String, ({String name, DateTime date})>{};
    for (final routePoint in snapshot.routes.expand((item) => item.points)) {
      final date = routePoint.stamp?.createdAt;
      if (routePoint.completed && date != null) {
        activityByCode[routePoint.code] = (name: routePoint.name, date: date);
      }
    }
    for (final card in recent) {
      final date = card.capturedAt;
      if (date != null) {
        activityByCode.putIfAbsent(card.code, () => (name: card.pointName, date: date));
      }
    }
    final activities = activityByCode.entries.toList()
      ..sort((a, b) => b.value.date.compareTo(a.value.date));

    final content = ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 32),
      children: [
        if (showingStaleData) const _OfflineNotice(),
        _HomeHero(
          firstName: firstName,
          capturedCards: snapshot.capturedCards,
          totalCards: snapshot.totalCards,
        ),
        const SizedBox(height: 14),
        Row(children: [
          Expanded(child: _HomeAction(
            icon: Icons.explore_outlined,
            label: 'Explorar mapa',
            onTap: onOpenMap,
            primary: true,
          )),
          const SizedBox(width: 10),
          Expanded(child: _HomeAction(
            icon: Icons.nfc,
            label: 'Ler TAG',
            onTap: onOpenStamp,
          )),
        ]),
        const SizedBox(height: 14),
        _Panel(
          child: Row(children: [
            const Icon(Icons.near_me_outlined, color: _C.gold, size: 23),
            const SizedBox(width: 11),
            const Expanded(child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Descobertas próximas', style: TextStyle(color: _C.ink, fontWeight: FontWeight.w800)),
                SizedBox(height: 3),
                Text('Encontre pontos publicados perto de você.', style: TextStyle(color: _C.muted, fontSize: 11)),
              ],
            )),
            IconButton(
              tooltip: 'Encontrar pontos próximos',
              onPressed: onFindNearby,
              icon: const Icon(Icons.arrow_forward_rounded, color: _C.gold),
            ),
          ]),
        ),
        const SizedBox(height: 20),
        _HomeSectionHeading(
          title: 'Sua jornada',
          action: 'Ver coleção',
          onTap: onOpenCollection,
        ),
        _ProgressCard(snapshot: snapshot, onTap: onOpenCollection),
        const SizedBox(height: 20),
        _HomeSectionHeading(
          title: 'Continue de onde parou',
          action: route == null ? null : 'Ver rotas',
          onTap: onOpenRoutes,
        ),
        if (route != null && next != null)
          _Panel(child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                const Icon(Icons.route_outlined, color: _C.gold),
                const SizedBox(width: 9),
                Expanded(child: Text(route.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: _C.ink, fontWeight: FontWeight.w800),
                )),
                _Tag(label: '${(route.progress * 100).round()}%'),
              ]),
              const SizedBox(height: 10),
              _Bar(value: route.progress),
              const SizedBox(height: 13),
              const Text('PRÓXIMA DESCOBERTA',
                style: TextStyle(color: _C.gold, fontSize: 9, letterSpacing: 1.3, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 5),
              Text(next.name, style: const TextStyle(color: _C.ink, fontSize: 17, fontWeight: FontWeight.w800)),
              const SizedBox(height: 3),
              Text(next.code, style: const TextStyle(color: _C.muted, fontSize: 11)),
              const SizedBox(height: 12),
              Wrap(spacing: 8, runSpacing: 8, children: [
                OutlinedButton.icon(
                  onPressed: onOpenMap,
                  icon: const Icon(Icons.map_outlined),
                  label: const Text('Abrir mapa'),
                ),
                FilledButton.tonalIcon(
                  onPressed: () => onOpenPoint(next.code),
                  icon: const Icon(Icons.info_outline),
                  label: const Text('Detalhes do ponto'),
                ),
              ]),
            ],
          ))
        else
          _Panel(child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Icon(Icons.flag_outlined, color: _C.gold, size: 26),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(
                snapshot.routes.isEmpty ? 'Sua primeira rota está esperando' : 'Você chegou ao fim das rotas disponíveis',
                style: const TextStyle(color: _C.ink, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 4),
              const Text('Explore o mapa para descobrir outros pontos publicados.',
                style: TextStyle(color: _C.muted, height: 1.4, fontSize: 12),
              ),
              TextButton.icon(
                onPressed: onOpenMap,
                icon: const Icon(Icons.explore_outlined),
                label: const Text('Descobrir pontos'),
              ),
            ])),
          ])),
        const SizedBox(height: 20),
        _HomeSectionHeading(
          title: 'Conquistas recentes',
          action: recent.isEmpty ? null : 'Ver todas',
          onTap: onOpenCollection,
        ),
        if (recent.isEmpty)
          const _Empty(
            icon: Icons.auto_awesome_outlined,
            title: 'Sua coleção está começando',
            description: 'Sua primeira carta será desbloqueada quando uma visita for confirmada pelo servidor.',
          )
        else
          SizedBox(
            height: 150,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: recent.length > 5 ? 5 : recent.length,
              separatorBuilder: (_, _) => const SizedBox(width: 10),
              itemBuilder: (context, index) => SizedBox(
                width: 286,
                child: _CardTile(
                  card: recent[index],
                  onTap: () => onOpenPoint(recent[index].code),
                ),
              ),
            ),
          ),
        if (activities.isNotEmpty) ...[
          const SizedBox(height: 20),
          const _HomeSectionHeading(title: 'Sua atividade'),
          _Panel(child: Column(children: activities.take(4).map((entry) {
            final date = entry.value.date.toLocal();
            final formatted = date.day.toString().padLeft(2, '0') + '/' +
                date.month.toString().padLeft(2, '0') + '/' + date.year.toString();
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 7),
              child: Row(children: [
                const Icon(Icons.check_circle_outline, color: _C.gold, size: 19),
                const SizedBox(width: 10),
                Expanded(child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(entry.value.name, maxLines: 1, overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: _C.ink, fontWeight: FontWeight.w700)),
                    Text('Carimbo confirmado · ' + formatted,
                      style: const TextStyle(color: _C.muted, fontSize: 10)),
                  ],
                )),
              ]),
            );
          }).toList())),
        ],
        if (events.isNotEmpty) ...[
          const SizedBox(height: 20),
          const _HomeSectionHeading(title: 'Eventos ativos'),
          ...events.map((event) => Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: _EventTile(event: event),
          )),
        ],
        const SizedBox(height: 10),
        Center(child: Text(
          'Cada caminho conta uma história.',
          style: GoogleFonts.cinzel(color: _C.muted, fontSize: 12, fontStyle: FontStyle.italic),
        )),
      ],
    );

    if (onRefresh == null) return content;
    return RefreshIndicator(
      color: _C.gold,
      backgroundColor: _C.paper,
      onRefresh: onRefresh!,
      child: content,
    );
  }
}

class _OfflineNotice extends StatelessWidget {
  const _OfflineNotice();

  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 12),
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: const Color(0xFF5B4825).withValues(alpha: .28),
      borderRadius: BorderRadius.circular(13),
      border: Border.all(color: _C.gold.withValues(alpha: .35)),
    ),
    child: const Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Icon(Icons.cloud_off_outlined, color: _C.gold, size: 19),
      SizedBox(width: 9),
      Expanded(child: Text(
        'Sem conexão. Exibindo os últimos dados carregados neste acesso. Carimbos só são confirmados online.',
        style: TextStyle(color: _C.ink, fontSize: 11, height: 1.4),
      )),
    ]),
  );
}

class _HomeHero extends StatelessWidget {
  const _HomeHero({
    required this.firstName,
    required this.capturedCards,
    required this.totalCards,
  });

  final String firstName;
  final int capturedCards;
  final int totalCards;

  @override
  Widget build(BuildContext context) {
    final progress = totalCards == 0 ? 0.0 : capturedCards / totalCards;
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: BrandPalette.darkGreen.withValues(alpha: .55)),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [BrandPalette.darkCardStrong, BrandPalette.darkCard],
        ),
        boxShadow: const [
          BoxShadow(color: Color(0x44000000), blurRadius: 22, offset: Offset(0, 9)),
        ],
      ),
      child: Stack(children: [
        Positioned(
          right: -8,
          top: -10,
          child: Icon(Icons.explore_outlined, size: 112, color: _C.gold.withValues(alpha: .07)),
        ),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('+1 KM  /  EUNÁPOLIS',
            style: GoogleFonts.montserrat(color: _C.gold, fontSize: 10, letterSpacing: 2, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 12),
          Text('Olá, $firstName.',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.cinzel(color: _C.ink, fontSize: 25, height: 1.18, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 7),
          const Text('A cidade guarda histórias. Seu próximo passo é descobrir uma delas.',
            style: TextStyle(color: _C.muted, height: 1.5, fontSize: 12),
          ),
          const SizedBox(height: 18),
          Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(
                totalCards == 0 ? 'Sua coleção começa aqui' : '$capturedCards de $totalCards cartas',
                style: const TextStyle(color: _C.ink, fontWeight: FontWeight.w700, fontSize: 12),
              ),
              const SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(20),
                child: LinearProgressIndicator(
                  value: progress.clamp(0.0, 1.0).toDouble(),
                  minHeight: 5,
                  backgroundColor: _C.border,
                  color: _C.gold,
                ),
              ),
            ])),
            const SizedBox(width: 14),
            Text('${(progress * 100).round()}%',
              style: GoogleFonts.cinzel(color: _C.gold, fontSize: 22, fontWeight: FontWeight.w700),
            ),
          ]),
        ]),
      ]),
    );
  }
}

class _HomeAction extends StatelessWidget {
  const _HomeAction({
    required this.icon,
    required this.label,
    required this.onTap,
    this.primary = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback? onTap;
  final bool primary;

  @override
  Widget build(BuildContext context) {
    final foreground = primary ? BrandPalette.forestDeep : _C.ink;
    return Semantics(
      button: true,
      label: label,
      child: Material(
        color: primary ? _C.gold : _C.paper,
        borderRadius: BorderRadius.circular(15),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(15),
          child: Container(
            constraints: const BoxConstraints(minHeight: 54),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(15),
              border: Border.all(color: primary ? _C.gold : _C.border),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, size: 22, color: foreground),
                const SizedBox(height: 6),
                Text(
                  label,
                  maxLines: 2,
                  textAlign: TextAlign.center,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: foreground,
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _HomeSectionHeading extends StatelessWidget {
  const _HomeSectionHeading({required this.title, this.action, this.onTap});
  final String title;
  final String? action;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: Row(children: [
      Expanded(child: Text(title,
        style: GoogleFonts.cinzel(color: _C.ink, fontSize: 17, fontWeight: FontWeight.w700),
      )),
      if (action != null) TextButton(onPressed: onTap, child: Text(action!)),
    ]),
  );
}

class _RoutesPage extends StatelessWidget {
  const _RoutesPage({required this.snapshot, required this.onOpenPoint});
  final NotebookSnapshot snapshot;
  final ValueChanged<String> onOpenPoint;

  @override
  Widget build(BuildContext context) {
    final routes = [...snapshot.routes]
      ..sort((a, b) {
        int rank(NotebookRoute route) =>
            route.isComplete ? 1 : route.completed > 0 ? 0 : 2;
        return rank(a).compareTo(rank(b));
      });
    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 30),
      children: [
        const _Intro(
          eyebrow: 'ROTAS',
          title: 'Seus caminhos',
          subtitle: 'Acompanhe cada circuito e veja o que falta para concluir.',
        ),
        if (routes.isEmpty)
          const _Empty(
            icon: Icons.route_outlined,
            title: 'Nenhuma rota disponível',
            description: 'As rotas publicadas aparecerão aqui.',
          ),
        ...routes.map((route) => Padding(
              padding: const EdgeInsets.only(bottom: 13),
              child: _Panel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      const Icon(Icons.route, color: _C.forest),
                      const SizedBox(width: 9),
                      Expanded(
                        child: Text(route.name,
                            style: const TextStyle(
                                color: _C.ink,
                                fontSize: 17,
                                fontWeight: FontWeight.w800)),
                      ),
                      Text('${route.completed}/${route.total}',
                          style: const TextStyle(
                              color: _C.forest, fontWeight: FontWeight.w800)),
                    ]),
                    const SizedBox(height: 11),
                    _Bar(value: route.progress),
                    const SizedBox(height: 7),
                    Text(
                      route.isComplete
                          ? 'Concluída · certificado liberado'
                          : route.completed > 0
                              ? 'Em andamento · faltam ${route.remaining} pontos'
                              : '${route.total} pontos para começar',
                      style: const TextStyle(color: _C.muted, fontSize: 12),
                    ),
                    const Divider(height: 22, color: _C.border),
                    ...route.points.map((point) => ListTile(
                          contentPadding: EdgeInsets.zero,
                          dense: true,
                          leading: Icon(
                            point.completed ? Icons.check_circle : Icons.circle_outlined,
                            color: point.completed ? _C.forest : _C.muted,
                          ),
                          title: Text(point.name,
                              style: const TextStyle(
                                  color: _C.ink, fontWeight: FontWeight.w600)),
                          subtitle: Text(point.code,
                              style: const TextStyle(color: _C.muted, fontSize: 11)),
                          trailing: point.completed
                              ? const Text('Carimbado',
                                  style: TextStyle(color: _C.forest, fontSize: 11))
                              : null,
                          onTap: () => onOpenPoint(point.code),
                        )),
                  ],
                ),
              ),
            )),
      ],
    );
  }
}

class _CollectionPage extends StatefulWidget {
  const _CollectionPage({required this.snapshot, required this.onOpenPoint});
  final NotebookSnapshot snapshot;
  final ValueChanged<String> onOpenPoint;

  @override
  State<_CollectionPage> createState() => _CollectionPageState();
}

class _CollectionPageState extends State<_CollectionPage> {
  String _filter = 'todas';

  @override
  Widget build(BuildContext context) {
    final data = widget.snapshot;
    final cards = data.cards.where((card) {
      if (_filter == 'conquistadas') return card.captured;
      if (_filter == 'bloqueadas') return !card.captured;
      if (_filter == 'todas') return true;
      return card.category == _filter;
    }).toList();
    final categories = data.categories.keys.toList()..sort();
    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 30),
      children: [
        const _Intro(
          eyebrow: 'SUA COLEÇÃO',
          title: 'Caderneta de cartas',
          subtitle: 'Cada visita confirmada desbloqueia uma carta única.',
        ),
        _ProgressCard(snapshot: data),
        const SizedBox(height: 14),
        Wrap(
          spacing: 7,
          runSpacing: 7,
          children: [
            _Filter(label: 'Todas', selected: _filter == 'todas', onTap: () => setState(() => _filter = 'todas')),
            _Filter(label: 'Conquistadas', selected: _filter == 'conquistadas', onTap: () => setState(() => _filter = 'conquistadas')),
            _Filter(label: 'Bloqueadas', selected: _filter == 'bloqueadas', onTap: () => setState(() => _filter = 'bloqueadas')),
            ...categories.map((category) => _Filter(
                  label: _categoryLabel(category),
                  selected: _filter == category,
                  onTap: () => setState(() => _filter = category),
                )),
          ],
        ),
        const SizedBox(height: 14),
        if (cards.isEmpty)
          const _Empty(
            icon: Icons.collections_bookmark_outlined,
            title: 'Nenhuma carta neste filtro',
            description: 'Experimente outra categoria ou volte para todas.',
          ),
        if (cards.isNotEmpty)
          LayoutBuilder(builder: (context, constraints) {
            final columns = constraints.maxWidth >= 620 ? 3 : 2;
            return GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: cards.length,
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: columns,
                crossAxisSpacing: 12,
                mainAxisSpacing: 14,
                childAspectRatio: .68,
              ),
              itemBuilder: (context, index) => _CollectionCard(
                card: cards[index],
                onTap: () => widget.onOpenPoint(cards[index].code),
              ),
            );
          }),
      ],
    );
  }
}

class _ProgressCard extends StatelessWidget {
  const _ProgressCard({required this.snapshot, this.onTap});
  final NotebookSnapshot snapshot;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final percent = (snapshot.progress * 100).round();
    return _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            const Expanded(
              child: Text('Sua coleção',
                  style: TextStyle(color: _C.ink, fontSize: 17, fontWeight: FontWeight.w800)),
            ),
            Text('${snapshot.capturedCards}/${snapshot.totalCards}',
                style: const TextStyle(color: _C.gold, fontWeight: FontWeight.w800)),
          ]),
          const SizedBox(height: 12),
          _Bar(value: snapshot.progress),
          const SizedBox(height: 8),
          LayoutBuilder(
            builder: (context, constraints) {
              final progressLabel = Text(
                '$percent% concluído',
                style: const TextStyle(color: _C.muted, fontSize: 12),
              );
              if (constraints.maxWidth < 340) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    progressLabel,
                    if (onTap != null)
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton(
                          onPressed: onTap,
                          child: const Text('Ver coleção'),
                        ),
                      ),
                  ],
                );
              }
              return Row(
                children: [
                  progressLabel,
                  const Spacer(),
                  if (onTap != null)
                    TextButton(
                      onPressed: onTap,
                      child: const Text('Ver coleção'),
                    ),
                ],
              );
            },
          ),
          Row(children: [
            _Stat(label: 'rotas completas', value: snapshot.completedRoutes.toString()),
            const SizedBox(width: 18),
            _Stat(label: 'pontos carimbados', value: snapshot.capturedRoutePoints.toString()),
          ]),
        ],
      ),
    );
  }
}

class _CardTile extends StatelessWidget {
  const _CardTile({required this.card, this.onTap});
  final NotebookCard card;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final captured = card.captured;
    return Material(
      color: _C.paper,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: _C.border)),
          child: Row(children: [
            Container(
              width: 66,
              height: 82,
              clipBehavior: Clip.antiAlias,
              decoration: BoxDecoration(
                  color: captured ? _C.forest : _C.cream,
                  borderRadius: BorderRadius.circular(11)),
              child: captured && _cardArtUrl(card) != null
                  ? Image.network(
                      _cardArtUrl(card)!,
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) => _CardPlaceholder(card: card),
                    )
                  : _CardPlaceholder(card: card),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    captured ? (card.creature ?? card.pointName) : 'Carta bloqueada',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: _C.ink, fontWeight: FontWeight.w800, fontSize: 15),
                  ),
                  const SizedBox(height: 4),
                  Text(card.pointName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: _C.muted, fontSize: 12)),
                  const SizedBox(height: 7),
                  Wrap(spacing: 6, children: [
                    _Tag(label: _categoryLabel(card.category)),
                    _Tag(label: _rarityLabel(card.rarity)),
                  ]),
                  if (captured && card.phrase?.isNotEmpty == true) ...[
                    const SizedBox(height: 7),
                    Text('“${card.phrase}”',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: _C.gold, fontSize: 11, fontStyle: FontStyle.italic)),
                  ],
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: _C.muted),
          ]),
        ),
      ),
    );
  }
}

class _CollectionCard extends StatelessWidget {
  const _CollectionCard({required this.card, this.onTap});
  final NotebookCard card;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final captured = card.captured;
    final accent = switch (card.rarity) {
      'lendario' => const Color(0xFFE5BD52),
      'epico' => const Color(0xFFB68AD8),
      'raro' => const Color(0xFF7FD0A4),
      _ => BrandPalette.gold,
    };
    return Material(
      color: BrandPalette.darkCard,
      borderRadius: BorderRadius.circular(15),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(15),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(15),
            border: Border.all(color: accent.withValues(alpha: captured ? .85 : .35), width: 1.2),
            boxShadow: const [BoxShadow(color: Color(0x44000000), blurRadius: 16, offset: Offset(0, 7))],
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                flex: 7,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    Container(
                      color: BrandPalette.forestDeep,
                      child: captured && _cardArtUrl(card) != null
                          ? Image.network(
                              _cardArtUrl(card)!,
                              fit: BoxFit.cover,
                              errorBuilder: (_, _, _) => _CardPlaceholder(card: card),
                            )
                          : _CardPlaceholder(card: card),
                    ),
                    Positioned(
                      top: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                        decoration: BoxDecoration(
                          color: BrandPalette.forestDeep.withValues(alpha: .9),
                          border: Border.all(color: accent),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          card.number > 0 ? card.number.toString().padLeft(3, '0') : '---',
                          style: GoogleFonts.cinzel(color: accent, fontSize: 10, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                    if (!captured)
                      Positioned.fill(
                        child: Container(
                          color: BrandPalette.forestDeep.withValues(alpha: .35),
                          child: const Center(child: Icon(Icons.lock_outline, color: BrandPalette.darkMuted, size: 28)),
                        ),
                      ),
                  ],
                ),
              ),
              Expanded(
                flex: 4,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(9, 8, 9, 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        captured ? (card.creature ?? card.pointName) : 'Carta bloqueada',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.cinzel(color: captured ? BrandPalette.cream : BrandPalette.darkMuted, fontSize: 11, fontWeight: FontWeight.w700, height: 1.25),
                      ),
                      const SizedBox(height: 4),
                      Text(card.pointName, maxLines: 1, overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: BrandPalette.darkMuted, fontSize: 9)),
                      const Spacer(),
                      Row(children: [
                        Expanded(child: Text(_categoryLabel(card.category).toUpperCase(),
                          maxLines: 1, overflow: TextOverflow.ellipsis,
                          style: TextStyle(color: accent, fontSize: 8, letterSpacing: .7, fontWeight: FontWeight.w800))),
                        Text(_rarityLabel(card.rarity), style: TextStyle(color: accent, fontSize: 8, fontWeight: FontWeight.w700)),
                      ]),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CardPlaceholder extends StatelessWidget {
  const _CardPlaceholder({required this.card});
  final NotebookCard card;

  @override
  Widget build(BuildContext context) => Center(
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(_categoryIcon(card.category),
              color: card.captured ? _C.gold : _C.muted, size: 27),
          const SizedBox(height: 5),
          Text(card.number > 0 ? card.number.toString().padLeft(3, '0') : '---',
              style: TextStyle(
                  color: card.captured ? Colors.white : _C.muted,
                  fontWeight: FontWeight.w800,
                  fontSize: 12)),
        ]),
      );
}

class _EventTile extends StatelessWidget {
  const _EventTile({required this.event});
  final NotebookEvent event;

  @override
  Widget build(BuildContext context) {
    final label = event.state == 'ao_vivo'
        ? 'Ao vivo'
        : event.state == 'em_breve'
            ? 'Em breve'
            : 'Encerrado';
    return _Panel(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text(event.name,
              style: const TextStyle(color: _C.ink, fontSize: 16, fontWeight: FontWeight.w800))),
          _Tag(label: label),
        ]),
        if (event.sponsor?.isNotEmpty == true) ...[
          const SizedBox(height: 4),
          Text('Patrocinado por ${event.sponsor}',
              style: const TextStyle(color: _C.muted, fontSize: 11)),
        ],
        if (event.description?.isNotEmpty == true) ...[
          const SizedBox(height: 8),
          Text(event.description!, style: const TextStyle(color: _C.ink, height: 1.4)),
        ],
        const SizedBox(height: 10),
        _Bar(value: event.progress),
        const SizedBox(height: 6),
        Text('${event.completed}/${event.total} pontos do card',
            style: const TextStyle(color: _C.muted, fontSize: 12)),
      ]),
    );
  }
}

class _Intro extends StatelessWidget {
  const _Intro({required this.eyebrow, required this.title, required this.subtitle});
  final String eyebrow;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 18),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(eyebrow, style: GoogleFonts.montserrat(color: _C.gold, fontSize: 10, letterSpacing: 2, fontWeight: FontWeight.w800)),
          const SizedBox(height: 5),
          Text(title, style: GoogleFonts.cinzel(color: _C.ink, fontSize: 25, fontWeight: FontWeight.w700)),
          const SizedBox(height: 5),
          Text(subtitle, style: const TextStyle(color: _C.muted, height: 1.4)),
        ]),
      );
}

class _Panel extends StatelessWidget {
  const _Panel({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
            color: _C.paper,
            borderRadius: BorderRadius.circular(17),
            border: Border.all(color: _C.border)),
        child: child,
      );
}

class _Bar extends StatelessWidget {
  const _Bar({required this.value});
  final double value;

  @override
  Widget build(BuildContext context) => ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: LinearProgressIndicator(
            value: value.clamp(0.0, 1.0).toDouble(),
            minHeight: 8,
            backgroundColor: _C.border,
            color: _C.gold),
      );
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Expanded(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(value, style: const TextStyle(color: _C.gold, fontSize: 18, fontWeight: FontWeight.w900)),
          Text(label, style: const TextStyle(color: _C.muted, fontSize: 10)),
        ]),
      );
}

class _Tag extends StatelessWidget {
  const _Tag({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(color: _C.cream, borderRadius: BorderRadius.circular(20)),
        child: Text(label, style: const TextStyle(color: _C.forest, fontSize: 10, fontWeight: FontWeight.w700)),
      );
}

class _Filter extends StatelessWidget {
  const _Filter({required this.label, required this.selected, required this.onTap});
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => ChoiceChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => onTap(),
        selectedColor: _C.gold.withValues(alpha: .2),
        labelStyle: TextStyle(
            color: selected ? _C.gold : _C.muted,
            fontWeight: selected ? FontWeight.w800 : FontWeight.w500),
      );
}

class _Empty extends StatelessWidget {
  const _Empty({required this.icon, required this.title, required this.description});
  final IconData icon;
  final String title;
  final String description;

  @override
  Widget build(BuildContext context) => _Panel(
        child: Column(children: [
          Icon(icon, size: 38, color: _C.gold),
          const SizedBox(height: 9),
          Text(title, style: const TextStyle(color: _C.ink, fontWeight: FontWeight.w800)),
          const SizedBox(height: 5),
          Text(description, textAlign: TextAlign.center, style: const TextStyle(color: _C.muted, height: 1.4)),
        ]),
      );
}

class _LoadError extends StatelessWidget {
  const _LoadError({required this.message, this.onRetry});
  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.cloud_off_outlined, size: 42, color: _C.muted),
            const SizedBox(height: 10),
            Text(message, textAlign: TextAlign.center, style: const TextStyle(color: _C.muted)),
            if (onRetry != null)
              TextButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh), label: const Text('Tentar novamente')),
          ]),
        ),
      );
}

String? _cardArtUrl(NotebookCard card) {
  final thumbnail = card.artThumbnail;
  if (thumbnail != null &&
      RegExp(r'^/midia/[\\w.]+\\.webp$').hasMatch(thumbnail)) {
    return 'https://mais1km.novaagencian8n.online$thumbnail';
  }
  final art = card.art;
  if (art != null && RegExp(r'^[\\w.-]{1,80}$').hasMatch(art)) {
    return 'https://mais1km.novaagencian8n.online/cartas/$art';
  }
  return null;
}

IconData _categoryIcon(String category) => switch (category) {
      'natureza' => Icons.eco_outlined,
      'historia' => Icons.account_balance_outlined,
      'cultura' => Icons.music_note_outlined,
      'trabalho' => Icons.agriculture_outlined,
      'litoral' => Icons.waves_outlined,
      'misterio' => Icons.auto_awesome_outlined,
      _ => Icons.auto_awesome_outlined,
    };

String _categoryLabel(String value) => switch (value) {
      'natureza' => 'Natureza',
      'historia' => 'História',
      'cultura' => 'Cultura',
      'trabalho' => 'Trabalho',
      'litoral' => 'Litoral',
      'misterio' => 'Mistério',
      _ => value,
    };

String _rarityLabel(String value) => switch (value) {
      'raro' => 'Raro',
      'epico' => 'Épico',
      'lendario' => 'Lendário',
      _ => 'Comum',
    };
