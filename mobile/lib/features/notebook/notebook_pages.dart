import 'package:flutter/material.dart';

import '../../core/models/notebook_snapshot.dart';

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
    );
  }
}

class _C {
  static const forest = Color(0xFF173D2E);
  static const gold = Color(0xFFC7A45D);
  static const cream = Color(0xFFF5F1E7);
  static const paper = Color(0xFFFFFDF8);
  static const ink = Color(0xFF202820);
  static const muted = Color(0xFF6F786F);
  static const border = Color(0xFFE3DED1);
}

class _HomePage extends StatelessWidget {
  const _HomePage({
    required this.snapshot,
    required this.user,
    required this.onOpenMap,
    required this.onOpenCollection,
  });

  final NotebookSnapshot snapshot;
  final Map<String, dynamic> user;
  final VoidCallback onOpenMap;
  final VoidCallback onOpenCollection;

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
            color: _C.forest,
            borderRadius: BorderRadius.circular(22),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('+1 KM · EUNÁPOLIS',
                  style: TextStyle(
                      color: _C.gold,
                      fontSize: 11,
                      letterSpacing: 1.3,
                      fontWeight: FontWeight.w800)),
              const SizedBox(height: 12),
              Text(
                snapshot.capturedCards == 0
                    ? 'Sua próxima descoberta começa aqui, ' + name + '.'
                    : 'Continue descobrindo Eunápolis, ' + name + '.',
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 23,
                    height: 1.15,
                    fontWeight: FontWeight.w800),
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
                    backgroundColor: _C.gold, foregroundColor: _C.forest),
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
                child: _CardTile(card: card),
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
                      Text(route.completed.toString() + '/' + route.total.toString(),
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
                              ? 'Em andamento · faltam ' + route.remaining.toString() + ' pontos'
                              : route.total.toString() + ' pontos para começar',
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
        ...cards.map((card) => Padding(
              padding: const EdgeInsets.only(bottom: 9),
              child: _CardTile(
                card: card,
                onTap: () => widget.onOpenPoint(card.code),
              ),
            )),
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
            Text(snapshot.capturedCards.toString() + '/' + snapshot.totalCards.toString(),
                style: const TextStyle(color: _C.forest, fontWeight: FontWeight.w800)),
          ]),
          const SizedBox(height: 12),
          _Bar(value: snapshot.progress),
          const SizedBox(height: 8),
          Row(children: [
            Text(percent.toString() + '% concluído',
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
                      errorBuilder: (_, __, ___) => _CardPlaceholder(card: card),
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
                    Text('“' + card.phrase! + '”',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: _C.forest, fontSize: 11, fontStyle: FontStyle.italic)),
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
          Text('Patrocinado por ' + event.sponsor!,
              style: const TextStyle(color: _C.muted, fontSize: 11)),
        ],
        if (event.description?.isNotEmpty == true) ...[
          const SizedBox(height: 8),
          Text(event.description!, style: const TextStyle(color: _C.ink, height: 1.4)),
        ],
        const SizedBox(height: 10),
        _Bar(value: event.progress),
        const SizedBox(height: 6),
        Text(event.completed.toString() + '/' + event.total.toString() + ' pontos do card',
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
          Text(eyebrow, style: const TextStyle(color: _C.gold, fontSize: 10, letterSpacing: 1.4, fontWeight: FontWeight.w900)),
          const SizedBox(height: 5),
          Text(title, style: const TextStyle(color: _C.ink, fontSize: 25, fontWeight: FontWeight.w900)),
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
          Expanded(child: Text(title, style: const TextStyle(color: _C.ink, fontSize: 18, fontWeight: FontWeight.w800))),
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
            value: value.clamp(0.0, 1.0),
            minHeight: 8,
            backgroundColor: _C.cream,
            color: _C.forest),
      );
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Expanded(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(value, style: const TextStyle(color: _C.forest, fontSize: 18, fontWeight: FontWeight.w900)),
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
        selectedColor: _C.forest.withValues(alpha: .12),
        labelStyle: TextStyle(
            color: selected ? _C.forest : _C.muted,
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
  return 'https://mais1km.novaagencian8n.online' + (value.startsWith('/') ? value : '/' + value);
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
