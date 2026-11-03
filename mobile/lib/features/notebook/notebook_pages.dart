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
  });

  final NotebookSnapshot snapshot;
  final Map<String, dynamic> user;
  final VoidCallback onOpenMap;
  final VoidCallback onOpenCollection;
  final ValueChanged<String> onOpenPoint;

  @override
  Widget build(BuildContext context) {
    final name = (user['nome'] ?? snapshot.alias ?? 'Viajante').toString();
    final recent = snapshot.cards.where((card) => card.captured).toList()
      ..sort((a, b) => (b.capturedAt ?? DateTime(1970))
          .compareTo(a.capturedAt ?? DateTime(1970)));
    final next = snapshot.routes
        .expand((route) => route.points)
        .where((point) => point.published && !point.completed)
        .toList();

    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 30),
      children: [
        Container(
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: BrandPalette.darkGreen.withValues(alpha: .55)),
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [BrandPalette.darkCardStrong, BrandPalette.darkCard],
            ),
            boxShadow: const [
              BoxShadow(color: Color(0x55000000), blurRadius: 24, offset: Offset(0, 10)),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('+1 KM · EUNÁPOLIS',
                  style: GoogleFonts.montserrat(
                      color: _C.gold,
                      fontSize: 10,
                      letterSpacing: 2,
                      fontWeight: FontWeight.w800)),
              const SizedBox(height: 12),
              Text(
                snapshot.capturedCards == 0
                    ? 'Sua próxima descoberta começa aqui, $name.'
                    : 'Continue descobrindo Eunápolis, $name.',
                style: GoogleFonts.cinzel(
                    color: BrandPalette.cream,
                    fontSize: 23,
                    height: 1.2,
                    fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 9),
              const Text(
                'Encontre um ponto participante, aproxime o celular da tag NFC e conquiste cartas da cidade.',
                style: TextStyle(color: Color(0xFFE6E9E2), height: 1.45),
              ),
              const SizedBox(height: 18),
              FilledButton.icon(
                onPressed: onOpenMap,
                style: FilledButton.styleFrom(
                    backgroundColor: _C.gold,
                    foregroundColor: BrandPalette.forestDeep,
                    minimumSize: const Size(0, 48),
                    textStyle: const TextStyle(fontWeight: FontWeight.w800)),
                icon: const Icon(Icons.explore_outlined),
                label: const Text('Encontrar um ponto'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),
        _ProgressCard(snapshot: snapshot, onTap: onOpenCollection),
        const SizedBox(height: 24),
        const _Heading('Próximo passo'),
        if (next.isNotEmpty)
          _Panel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('CONTINUE SUA JORNADA',
                    style: TextStyle(
                        color: _C.muted,
                        fontSize: 10,
                        letterSpacing: 1,
                        fontWeight: FontWeight.w800)),
                const SizedBox(height: 7),
                Text(next.first.name,
                    style: const TextStyle(
                        color: _C.ink,
                        fontSize: 17,
                        fontWeight: FontWeight.w800)),
                const SizedBox(height: 4),
                Text(next.first.code,
                    style: const TextStyle(color: _C.muted)),
                const SizedBox(height: 10),
                OutlinedButton.icon(
                    onPressed: onOpenMap,
                    icon: const Icon(Icons.map_outlined),
                    label: const Text('Ver no mapa')),
              ],
            ),
          )
        else
          const _Panel(
              child: Text('Você concluiu todos os pontos publicados nas rotas disponíveis.')),
        const SizedBox(height: 24),
        _Heading('Cartas conquistadas', action: 'Ver coleção', onTap: onOpenCollection),
        if (recent.isEmpty)
          const _Empty(
            icon: Icons.auto_awesome_outlined,
            title: 'Sua coleção está começando',
            description: 'Sua primeira carta será desbloqueada quando uma visita for confirmada pelo servidor.',
          )
        else
          ...recent.take(3).map((card) => Padding(
                padding: const EdgeInsets.only(bottom: 9),
                child: _CardTile(card: card, onTap: () => onOpenPoint(card.code)),
              )),
        if (snapshot.events.isNotEmpty) ...[
          const SizedBox(height: 24),
          const _Heading('Eventos e patrocínios'),
          ...snapshot.events.map((event) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _EventTile(event: event),
              )),
        ],
      ],
    );
  }
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
          Row(children: [
            Text('$percent% concluído',
                style: const TextStyle(color: _C.muted, fontSize: 12)),
            const Spacer(),
            if (onTap != null)
              TextButton(onPressed: onTap, child: const Text('Ver coleção')),
          ]),
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
              child: captured && card.artThumbnail != null
                  ? Image.network(
                      _mediaUrl(card.artThumbnail!),
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
                      child: captured && card.artThumbnail != null
                          ? Image.network(
                              _mediaUrl(card.artThumbnail!),
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
          Icon(card.captured ? Icons.auto_awesome : Icons.lock_outline,
              color: card.captured ? _C.gold : _C.muted, size: 23),
          const SizedBox(height: 5),
          Text(card.number > 0 ? card.number.toString().padLeft(2, '0') : '—',
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

class _Heading extends StatelessWidget {
  const _Heading(this.title, {this.action, this.onTap});
  final String title;
  final String? action;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 11),
        child: Row(children: [
          Expanded(child: Text(title, style: GoogleFonts.cinzel(color: _C.ink, fontSize: 18, fontWeight: FontWeight.w700))),
          if (action != null) TextButton(onPressed: onTap, child: Text(action!)),
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

String _mediaUrl(String value) {
  if (value.startsWith('https://') || value.startsWith('http://')) return value;
  return 'https://mais1km.novaagencian8n.online${value.startsWith('/') ? value : '/$value'}';
}

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
