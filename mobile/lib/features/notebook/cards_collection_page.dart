import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/models/notebook_snapshot.dart';
import '../../core/theme/brand_theme.dart';

class CardsCollectionPage extends StatefulWidget {
  const CardsCollectionPage({super.key, required this.snapshot, required this.onOpenPoint, this.user = const {}, this.onLoadPointImages});

  final NotebookSnapshot snapshot;
  final ValueChanged<String> onOpenPoint;
  final Map<String, dynamic> user;
  final Future<List<NotebookPointImage>> Function(String code)? onLoadPointImages;

  @override
  State<CardsCollectionPage> createState() => _CardsCollectionPageState();
}

class _CardsCollectionPageState extends State<CardsCollectionPage> {
  String _filter = 'todas';

  static const _categories = <String, String>{
    'natureza': 'Natureza',
    'historia': 'História',
    'cultura': 'Cultura',
    'trabalho': 'Trabalho',
    'litoral': 'Litoral',
    'misterio': 'Mistério',
  };

  @override
  Widget build(BuildContext context) {
    final data = widget.snapshot;
    final categories = data.categories.keys.where(_categories.containsKey).toList()
      ..sort((a, b) => _categories.keys.toList().indexOf(a).compareTo(_categories.keys.toList().indexOf(b)));
    final filtered = data.cards.where((card) {
      if (_filter == 'conquistadas') return card.captured;
      if (_filter == 'bloqueadas') return !card.captured;
      if (_categories.containsKey(_filter)) return card.category == _filter;
      return true;
    }).toList();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 18, 16, 32),
      children: [
        _intro(),
        _overview(data),
        const SizedBox(height: 18),
        _heading('Suas cartas', '${data.cards.length} cartas nesta edição'),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(children: [
            _filterChip('Todas', 'todas', data.cards.length),
            const SizedBox(width: 7),
            _filterChip('Conquistadas', 'conquistadas', data.capturedCards),
            const SizedBox(width: 7),
            _filterChip('Bloqueadas', 'bloqueadas', data.totalCards - data.capturedCards),
            for (final category in categories) ...[
              const SizedBox(width: 7),
              _filterChip(_categories[category]!, category, data.categories[category]?['total'] ?? 0),
            ],
          ]),
        ),
        const SizedBox(height: 14),
        if (filtered.isEmpty)
          const _EmptyCollection()
        else
          LayoutBuilder(builder: (context, constraints) {
            final columns = constraints.maxWidth >= 720 ? 4 : constraints.maxWidth >= 480 ? 3 : 2;
            return GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: filtered.length,
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: columns,
                crossAxisSpacing: 11,
                mainAxisSpacing: 13,
                childAspectRatio: .66,
              ),
              itemBuilder: (context, index) => _CardTile(
                card: filtered[index],
                onTap: () => _showCard(filtered[index]),
              ),
            );
          }),
        const SizedBox(height: 24),
        _heading('Conquistas especiais', 'Marcos da sua jornada'),
        _achievements(data),
        const SizedBox(height: 24),
        _heading('Certificados', '${data.completedRoutes} rotas concluídas'),
        _certificates(data),
        const SizedBox(height: 24),
        _heading('Histórico', 'Últimos carimbos confirmados'),
        _history(data),
      ],
    );
  }

  Widget _intro() => Padding(
    padding: const EdgeInsets.only(bottom: 16),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('ARQUIVO DE EUNÁPOLIS', style: GoogleFonts.montserrat(
        color: BrandPalette.gold, fontSize: 10, letterSpacing: 2, fontWeight: FontWeight.w800)),
      const SizedBox(height: 5),
      Text('Sua coleção', style: GoogleFonts.cinzel(
        color: BrandPalette.cream, fontSize: 26, fontWeight: FontWeight.w700)),
      const SizedBox(height: 5),
      const Text('Cada ponto guarda uma história. Visite, confirme seu carimbo e desbloqueie uma carta única.',
        style: TextStyle(color: BrandPalette.darkMuted, height: 1.45, fontSize: 12)),
    ]),
  );

  Widget _overview(NotebookSnapshot data) {
    final percent = data.progress.clamp(0.0, 1.0).toDouble();
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: BrandPalette.darkRule),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [BrandPalette.darkCardStrong, BrandPalette.darkCard],
        ),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Icon(Icons.auto_awesome, color: BrandPalette.gold, size: 21),
          const SizedBox(width: 9),
          const Expanded(child: Text('Progresso da coleção', style: TextStyle(
            color: BrandPalette.cream, fontWeight: FontWeight.w800, fontSize: 15))),
          Text('${data.capturedCards}/${data.totalCards}', style: const TextStyle(
            color: BrandPalette.gold, fontWeight: FontWeight.w900, fontSize: 16)),
        ]),
        const SizedBox(height: 12),
        ClipRRect(
          borderRadius: BorderRadius.circular(20),
          child: LinearProgressIndicator(
            value: percent, minHeight: 8,
            backgroundColor: BrandPalette.darkRule, color: BrandPalette.gold,
          ),
        ),
        const SizedBox(height: 8),
        Text('${(percent * 100).round()}% concluído · ${data.totalCards - data.capturedCards} cartas restantes',
          style: const TextStyle(color: BrandPalette.darkMuted, fontSize: 11)),
        const Divider(height: 23, color: BrandPalette.darkRule),
        Row(children: [
          _metric('Cartas', '${data.capturedCards}'),
          _metric('Rotas completas', '${data.completedRoutes}'),
          _metric('Pontos carimbados', '${data.capturedRoutePoints}'),
        ]),
      ]),
    );
  }

  Widget _metric(String label, String value) => Expanded(child: Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(value, style: const TextStyle(color: BrandPalette.gold, fontSize: 19, fontWeight: FontWeight.w900)),
      Text(label, style: const TextStyle(color: BrandPalette.darkMuted, fontSize: 9)),
    ],
  ));

  Widget _heading(String title, String subtitle) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: GoogleFonts.cinzel(color: BrandPalette.cream, fontSize: 17, fontWeight: FontWeight.w700)),
        Text(subtitle, style: const TextStyle(color: BrandPalette.darkMuted, fontSize: 10)),
      ])),
    ]),
  );

  Widget _filterChip(String label, String value, int count) {
    final selected = _filter == value;
    return ChoiceChip(
      label: Text('$label · $count'),
      selected: selected,
      onSelected: (_) => setState(() => _filter = value),
      selectedColor: BrandPalette.gold.withValues(alpha: .18),
      backgroundColor: BrandPalette.darkCard,
      side: BorderSide(color: selected ? BrandPalette.gold : BrandPalette.darkRule),
      labelStyle: TextStyle(color: selected ? BrandPalette.gold : BrandPalette.darkMuted,
        fontSize: 10, fontWeight: selected ? FontWeight.w800 : FontWeight.w500),
      visualDensity: VisualDensity.compact,
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
    );
  }

  Widget _achievements(NotebookSnapshot data) {
    final badges = <({String title, String note, IconData icon, bool earned})>[
      (title: 'Primeira carta', note: 'Desbloqueie sua primeira carta', icon: Icons.auto_awesome, earned: data.capturedCards >= 1),
      (title: 'Explorador', note: 'Conquiste 5 pontos da cidade', icon: Icons.explore, earned: data.capturedCards >= 5),
      (title: 'Uma rota inteira', note: 'Complete uma rota temática', icon: Icons.route, earned: data.completedRoutes >= 1),
      (title: 'Eunápolis completa', note: 'Conquiste todos os pontos desta edição', icon: Icons.workspace_premium, earned: data.totalCards > 0 && data.capturedCards == data.totalCards),
    ];
    return Column(children: badges.map((badge) => Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: BrandPalette.darkCard,
        borderRadius: BorderRadius.circular(13),
        border: Border.all(color: badge.earned ? BrandPalette.gold.withValues(alpha: .65) : BrandPalette.darkRule),
      ),
      child: Row(children: [
        Icon(badge.earned ? badge.icon : Icons.lock_outline,
          color: badge.earned ? BrandPalette.gold : BrandPalette.darkMuted, size: 23),
        const SizedBox(width: 11),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(badge.title, style: const TextStyle(color: BrandPalette.cream, fontWeight: FontWeight.w700, fontSize: 12)),
          Text(badge.earned ? 'Guardada na sua coleção' : badge.note,
            style: const TextStyle(color: BrandPalette.darkMuted, fontSize: 10)),
        ])),
        Text(badge.earned ? 'Conquistada' : 'Em aberto', style: TextStyle(
          color: badge.earned ? BrandPalette.gold : BrandPalette.darkMuted, fontSize: 9, fontWeight: FontWeight.w700)),
      ]),
    )).toList());
  }

  Widget _certificates(NotebookSnapshot data) {
    final completed = data.routes.where((route) => route.isComplete).toList();
    if (completed.isEmpty) {
      return const _CollectionPanel(child: Text(
        'Complete todos os pontos de uma rota para liberar seu certificado.',
        textAlign: TextAlign.center,
        style: TextStyle(color: BrandPalette.darkMuted, fontSize: 11, height: 1.5),
      ));
    }
    return Column(children: completed.map((route) {
      final dates = route.points.map((point) => point.stamp?.createdAt).whereType<DateTime>().toList()
        ..sort((a, b) => b.compareTo(a));
      final completedAt = dates.isEmpty ? null : dates.first;
      return Container(
        margin: const EdgeInsets.only(bottom: 9),
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          color: BrandPalette.darkCard,
          borderRadius: BorderRadius.circular(13),
          border: Border.all(color: BrandPalette.gold.withValues(alpha: .5)),
        ),
        child: Row(children: [
          const Icon(Icons.workspace_premium_outlined, color: BrandPalette.gold, size: 28),
          const SizedBox(width: 11),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(route.name, style: const TextStyle(color: BrandPalette.cream, fontSize: 12, fontWeight: FontWeight.w800)),
            Text('${route.total} pontos · ${completedAt == null ? 'Concluída' : _formatDate(completedAt)}',
              style: const TextStyle(color: BrandPalette.darkMuted, fontSize: 10)),
          ])),
          TextButton(
            onPressed: () => _showCertificate(route, completedAt),
            child: const Text('Visualizar'),
          ),
        ]),
      );
    }).toList());
  }

  Future<void> _showCertificate(NotebookRoute route, DateTime? completedAt) async {
    final name = (widget.user['nome'] ?? widget.user['apelido'] ?? 'Explorador').toString();
    final number = widget.user['numero']?.toString();
    await showDialog<void>(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: BrandPalette.darkCardStrong,
        insetPadding: const EdgeInsets.all(18),
        child: Container(
          padding: const EdgeInsets.fromLTRB(20, 26, 20, 22),
          decoration: BoxDecoration(
            border: Border.all(color: BrandPalette.gold, width: 1.5),
          ),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Text('✦  ·  ✦  ·  ✦', style: TextStyle(color: BrandPalette.gold, fontSize: 18)),
            const SizedBox(height: 14),
            Text('+1 KM · EUNÁPOLIS', style: GoogleFonts.montserrat(
              color: BrandPalette.gold, fontSize: 9, letterSpacing: 2, fontWeight: FontWeight.w800)),
            const SizedBox(height: 12),
            Text('Certificado de rota', textAlign: TextAlign.center,
              style: GoogleFonts.cinzel(color: BrandPalette.cream, fontSize: 23, fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            const Text('Atesta que', style: TextStyle(color: BrandPalette.darkMuted, fontSize: 11)),
            const SizedBox(height: 5),
            Text(name, textAlign: TextAlign.center,
              style: GoogleFonts.cinzel(color: BrandPalette.gold, fontSize: 20, fontWeight: FontWeight.w700)),
            const SizedBox(height: 10),
            Text('completou todos os ${route.total} pontos da rota',
              textAlign: TextAlign.center, style: const TextStyle(color: BrandPalette.cream, fontSize: 11)),
            const SizedBox(height: 6),
            Text(route.name, textAlign: TextAlign.center,
              style: GoogleFonts.cinzel(color: BrandPalette.gold, fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(height: 16),
            Wrap(alignment: WrapAlignment.center, spacing: 5, children: route.points.take(6).map((point) =>
              Container(width: 30, height: 30, alignment: Alignment.center,
                decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: BrandPalette.gold)),
                child: const Icon(Icons.check, color: BrandPalette.gold, size: 15),
              )).toList()),
            const SizedBox(height: 14),
            Text('${completedAt == null ? 'Todos os pontos confirmados' : 'Concluída em ${_formatDate(completedAt)}'}${number == null ? '' : ' · Caderneta nº $number'}',
              textAlign: TextAlign.center, style: const TextStyle(color: BrandPalette.darkMuted, fontSize: 9)),
            const SizedBox(height: 17),
            const Text('Cada ponto, uma história guardada.',
              textAlign: TextAlign.center, style: TextStyle(color: BrandPalette.gold, fontSize: 10, fontStyle: FontStyle.italic)),
            const SizedBox(height: 14),
            SizedBox(width: double.infinity, child: FilledButton(
              onPressed: () => Navigator.of(context).pop(),
              style: FilledButton.styleFrom(backgroundColor: BrandPalette.gold, foregroundColor: BrandPalette.forestDeep),
              child: const Text('Fechar'),
            )),
          ]),
        ),
      ),
    );
  }

  Widget _history(NotebookSnapshot data) {
    final entries = data.cards.where((card) => card.captured && card.capturedAt != null).toList()
      ..sort((a, b) => b.capturedAt!.compareTo(a.capturedAt!));
    if (entries.isEmpty) {
      return const _CollectionPanel(child: Text('Sua primeira carta começa com uma descoberta confirmada.',
        textAlign: TextAlign.center, style: TextStyle(color: BrandPalette.darkMuted, fontSize: 12)));
    }
    return _CollectionPanel(child: Column(children: entries.take(5).map((card) {
      final date = card.capturedAt!.toLocal();
      final formatted = '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
      return ListTile(
        dense: true,
        contentPadding: EdgeInsets.zero,
        leading: const Icon(Icons.verified_outlined, color: BrandPalette.gold, size: 20),
        title: Text(card.pointName, style: const TextStyle(color: BrandPalette.cream, fontSize: 12, fontWeight: FontWeight.w700)),
        subtitle: Text('Carimbo confirmado · $formatted', style: const TextStyle(color: BrandPalette.darkMuted, fontSize: 10)),
        trailing: Text(card.number.toString().padLeft(3, '0'), style: const TextStyle(color: BrandPalette.gold, fontSize: 10)),
      );
    }).toList()));
  }

  Future<void> _showCard(NotebookCard card) async {
    final photosFuture = widget.onLoadPointImages?.call(card.code);
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _CardDetailSheet(card: card, photosFuture: photosFuture, onOpenPoint: () {
        Navigator.of(context).pop();
        widget.onOpenPoint(card.code);
      }),
    );
  }
}

class _CardTile extends StatelessWidget {
  const _CardTile({required this.card, required this.onTap});
  final NotebookCard card;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final accent = _rarityColor(card.rarity);
    return Material(
      color: BrandPalette.darkCard,
      borderRadius: BorderRadius.circular(15),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(15),
        child: Container(
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(15),
            border: Border.all(color: accent.withValues(alpha: card.captured ? .9 : .35), width: 1.2),
            boxShadow: const [BoxShadow(color: Color(0x44000000), blurRadius: 14, offset: Offset(0, 6))],
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Expanded(flex: 7, child: Stack(fit: StackFit.expand, children: [
              _CardArtwork(card: card),
              Positioned(
                top: 7, left: 7,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
                  decoration: BoxDecoration(color: BrandPalette.forestDeep.withValues(alpha: .92),
                    borderRadius: BorderRadius.circular(20), border: Border.all(color: accent)),
                  child: Text(card.number > 0 ? card.number.toString().padLeft(3, '0') : '---',
                    style: GoogleFonts.cinzel(color: accent, fontSize: 10, fontWeight: FontWeight.w800)),
                ),
              ),
              if (!card.captured)
                Container(color: BrandPalette.forestDeep.withValues(alpha: .5),
                  child: const Center(child: Icon(Icons.lock_outline, color: BrandPalette.darkMuted, size: 27))),
            ])),
            Expanded(flex: 4, child: Padding(
              padding: const EdgeInsets.fromLTRB(9, 8, 9, 8),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(card.captured ? (card.creature ?? card.pointName) : 'Carta bloqueada',
                  maxLines: 2, overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.cinzel(color: card.captured ? BrandPalette.cream : BrandPalette.darkMuted,
                    fontSize: 11, fontWeight: FontWeight.w700, height: 1.2)),
                const SizedBox(height: 4),
                Text(card.pointName, maxLines: 1, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: BrandPalette.darkMuted, fontSize: 9)),
                const Spacer(),
                Row(children: [
                  Expanded(child: Text(_categoryLabel(card.category).toUpperCase(), maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: accent, fontSize: 8, letterSpacing: .5, fontWeight: FontWeight.w800))),
                  Text(_rarityLabel(card.rarity), style: TextStyle(color: accent, fontSize: 8, fontWeight: FontWeight.w700)),
                ]),
              ]),
            )),
          ]),
        ),
      ),
    );
  }
}

class _CardDetailSheet extends StatelessWidget {
  const _CardDetailSheet({required this.card, required this.onOpenPoint, this.photosFuture});
  final NotebookCard card;
  final VoidCallback onOpenPoint;
  final Future<List<NotebookPointImage>>? photosFuture;

  @override
  Widget build(BuildContext context) {
    final accent = _rarityColor(card.rarity);
    final bottom = MediaQuery.paddingOf(context).bottom;
    return DraggableScrollableSheet(
      initialChildSize: .88, minChildSize: .65, maxChildSize: .96,
      expand: false,
      builder: (context, controller) => Container(
        decoration: const BoxDecoration(
          color: BrandPalette.forestDeep,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: ListView(controller: controller, padding: EdgeInsets.fromLTRB(18, 12, 18, 22 + bottom), children: [
          Center(child: Container(width: 38, height: 4, decoration: BoxDecoration(
            color: BrandPalette.darkMuted, borderRadius: BorderRadius.circular(10)))),
          const SizedBox(height: 17),
          Text('ARQUIVO DE EUNÁPOLIS · CARTA ${card.number.toString().padLeft(3, '0')}',
            textAlign: TextAlign.center, style: GoogleFonts.montserrat(color: BrandPalette.gold,
              fontSize: 9, letterSpacing: 1.4, fontWeight: FontWeight.w800)),
          const SizedBox(height: 12),
          Center(child: SizedBox(width: 260, height: 330, child: _CardArtwork(card: card, detail: true))),
          const SizedBox(height: 15),
          Text(card.captured ? (card.creature ?? card.pointName) : 'Carta ainda bloqueada',
            textAlign: TextAlign.center, style: GoogleFonts.cinzel(color: BrandPalette.cream,
              fontSize: 22, fontWeight: FontWeight.w700)),
          const SizedBox(height: 5),
          Text(card.pointName, textAlign: TextAlign.center,
            style: const TextStyle(color: BrandPalette.darkMuted, fontSize: 12)),
          const SizedBox(height: 14),
          Wrap(alignment: WrapAlignment.center, spacing: 7, runSpacing: 7, children: [
            _DetailPill(label: _categoryLabel(card.category)),
            _DetailPill(label: _rarityLabel(card.rarity), color: accent),
          ]),
          const SizedBox(height: 18),
          _CollectionPanel(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            _detailRow('Número', card.number.toString().padLeft(3, '0')),
            _detailRow('Categoria', _categoryLabel(card.category)),
            _detailRow('Raridade', _rarityLabel(card.rarity)),
            _detailRow('Local', card.pointName),
            if (card.captured && card.capturedAt != null)
              _detailRow('Conquistada em', _formatDate(card.capturedAt!)),
          ])),
          if (card.captured && card.story?.isNotEmpty == true) ...[
            const SizedBox(height: 12),
            _CollectionPanel(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('HISTÓRIA', style: TextStyle(color: BrandPalette.gold, fontSize: 9, letterSpacing: 1.3, fontWeight: FontWeight.w800)),
              const SizedBox(height: 7),
              Text(card.story!, style: const TextStyle(color: BrandPalette.cream, height: 1.6, fontSize: 12)),
            ])),
          ],
          if (card.captured && card.phrase?.isNotEmpty == true) ...[
            const SizedBox(height: 12),
            _CollectionPanel(child: Text('“${card.phrase}”', textAlign: TextAlign.center,
              style: GoogleFonts.cinzel(color: BrandPalette.gold, fontSize: 14, fontStyle: FontStyle.italic, height: 1.5))),
          ],
          if (card.captured && photosFuture != null) ...[
            const SizedBox(height: 14),
            _PointPhotoGallery(future: photosFuture!),
          ],
          if (!card.captured) ...[
            const SizedBox(height: 12),
            const _CollectionPanel(child: Text('Encoste na TAG deste ponto e confirme sua visita para desbloquear esta carta.',
              textAlign: TextAlign.center, style: TextStyle(color: BrandPalette.darkMuted, height: 1.5, fontSize: 11))),
          ],
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: onOpenPoint,
            icon: const Icon(Icons.place_outlined),
            label: const Text('Ver ponto no mapa'),
            style: FilledButton.styleFrom(backgroundColor: BrandPalette.gold, foregroundColor: BrandPalette.forestDeep,
              minimumSize: const Size.fromHeight(48)),
          ),
        ]),
      ),
    );
  }

  Widget _detailRow(String label, String value) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 5),
    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      SizedBox(width: 112, child: Text(label, style: const TextStyle(color: BrandPalette.darkMuted, fontSize: 11))),
      Expanded(child: Text(value, style: const TextStyle(color: BrandPalette.cream, fontSize: 11, fontWeight: FontWeight.w700))),
    ]),
  );
}

class _PointPhotoGallery extends StatelessWidget {
  const _PointPhotoGallery({required this.future});
  final Future<List<NotebookPointImage>> future;

  @override
  Widget build(BuildContext context) => FutureBuilder<List<NotebookPointImage>>(
    future: future,
    builder: (context, snapshot) {
      if (snapshot.connectionState == ConnectionState.waiting) {
        return const _CollectionPanel(child: Row(children: [
          SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: BrandPalette.gold)),
          SizedBox(width: 10),
          Text('Carregando fotos do lugar…', style: TextStyle(color: BrandPalette.darkMuted, fontSize: 11)),
        ]));
      }
      if (snapshot.hasError) {
        return const _CollectionPanel(child: Text('Não foi possível carregar as fotos deste ponto agora.',
          style: TextStyle(color: BrandPalette.darkMuted, fontSize: 11)));
      }
      final photos = snapshot.data ?? const <NotebookPointImage>[];
      if (photos.isEmpty) return const SizedBox.shrink();
      final before = photos.where((photo) => photo.type == 'historica').firstOrNull;
      final today = photos.where((photo) => photo.type == 'atual').firstOrNull;
      return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('FOTOS DO LUGAR · \${photos.length}', style: const TextStyle(
          color: BrandPalette.gold, fontSize: 9, letterSpacing: 1.3, fontWeight: FontWeight.w800)),
        const SizedBox(height: 9),
        SizedBox(height: 118, child: ListView.separated(
          scrollDirection: Axis.horizontal,
          itemCount: photos.length,
          separatorBuilder: (_, _) => const SizedBox(width: 9),
          itemBuilder: (context, index) {
            final photo = photos[index];
            return InkWell(
              onTap: () => _showPhoto(context, photos, index),
              borderRadius: BorderRadius.circular(11),
              child: SizedBox(width: 112, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Expanded(child: ClipRRect(borderRadius: BorderRadius.circular(10),
                  child: Image.network(_publicPhotoUrl(photo.thumbnailUrl), width: 112, fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => const ColoredBox(color: BrandPalette.darkCard,
                      child: Center(child: Icon(Icons.broken_image_outlined, color: BrandPalette.darkMuted)))))),
                const SizedBox(height: 4),
                Text(_photoType(photo.type), maxLines: 1, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: BrandPalette.darkMuted, fontSize: 9)),
              ])),
            );
          },
        )),
        if (before != null && today != null) ...[
          const SizedBox(height: 16),
          _PhotoComparison(before: before, today: today),
        ],
      ]);
    },
  );

  Future<void> _showPhoto(BuildContext context, List<NotebookPointImage> photos, int initial) async {
    await showDialog<void>(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: BrandPalette.darkCardStrong,
        insetPadding: const EdgeInsets.all(12),
        child: SizedBox(
          height: MediaQuery.sizeOf(context).height * .78,
          child: PageView.builder(
            controller: PageController(initialPage: initial),
            itemCount: photos.length,
            itemBuilder: (context, index) {
              final photo = photos[index];
              final credits = [photo.author, photo.source].where((value) => value?.isNotEmpty == true).join(' · ');
              return Column(children: [
                Expanded(child: InteractiveViewer(child: Image.network(_publicPhotoUrl(photo.url), fit: BoxFit.contain,
                  errorBuilder: (_, _, _) => const Center(child: Icon(Icons.broken_image_outlined,
                    color: BrandPalette.darkMuted, size: 48))))),
                Padding(padding: const EdgeInsets.fromLTRB(14, 8, 14, 14), child: Column(children: [
                  Text(photo.title?.isNotEmpty == true ? photo.title! : _photoType(photo.type),
                    textAlign: TextAlign.center, style: const TextStyle(color: BrandPalette.cream, fontWeight: FontWeight.w800)),
                  if (photo.caption?.isNotEmpty == true) ...[
                    const SizedBox(height: 4),
                    Text(photo.caption!, textAlign: TextAlign.center,
                      style: const TextStyle(color: BrandPalette.darkMuted, fontSize: 11)),
                  ],
                  if (photo.historicPeriod?.isNotEmpty == true) ...[
                    const SizedBox(height: 3),
                    Text(photo.historicPeriod!, style: const TextStyle(color: BrandPalette.gold, fontSize: 10)),
                  ],
                  if (credits.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(credits, textAlign: TextAlign.center,
                      style: const TextStyle(color: BrandPalette.darkMuted, fontSize: 9)),
                  ],
                  Text('\${index + 1} de \${photos.length}', style: const TextStyle(color: BrandPalette.darkMuted, fontSize: 9)),
                ])),
              ]);
            },
          ),
        ),
      ),
    );
  }
}

class _PhotoComparison extends StatefulWidget {
  const _PhotoComparison({required this.before, required this.today});
  final NotebookPointImage before;
  final NotebookPointImage today;

  @override
  State<_PhotoComparison> createState() => _PhotoComparisonState();
}

class _PhotoComparisonState extends State<_PhotoComparison> {
  double _position = 50;

  @override
  Widget build(BuildContext context) => _CollectionPanel(child: Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const Text('ANTES E HOJE', style: TextStyle(color: BrandPalette.gold,
        fontSize: 9, letterSpacing: 1.2, fontWeight: FontWeight.w800)),
      const SizedBox(height: 8),
      ClipRRect(borderRadius: BorderRadius.circular(10), child: AspectRatio(
        aspectRatio: 16 / 9,
        child: LayoutBuilder(builder: (context, constraints) => Stack(fit: StackFit.expand, children: [
          Image.network(_publicPhotoUrl(widget.today.url), fit: BoxFit.cover,
            errorBuilder: (_, _, _) => const ColoredBox(color: BrandPalette.darkCard)),
          ClipRect(child: Align(
            alignment: Alignment.centerLeft,
            widthFactor: _position / 100,
            child: SizedBox(width: constraints.maxWidth, height: constraints.maxHeight,
              child: Image.network(_publicPhotoUrl(widget.before.url), fit: BoxFit.cover,
                errorBuilder: (_, _, _) => const ColoredBox(color: BrandPalette.darkCard))),
          )),
          Positioned(left: 7, top: 7, child: _DetailPill(label: 'Antes')),
          Positioned(right: 7, top: 7, child: _DetailPill(label: 'Hoje')),
          Positioned(left: constraints.maxWidth * _position / 100 - 1, top: 0, bottom: 0,
            child: Container(width: 2, color: BrandPalette.gold)),
        ])),
      )),
      Slider(value: _position, min: 0, max: 100, onChanged: (value) => setState(() => _position = value),
        activeColor: BrandPalette.gold, inactiveColor: BrandPalette.darkRule),
      const Text('Arraste para comparar a foto histórica com a atual.',
        style: TextStyle(color: BrandPalette.darkMuted, fontSize: 10)),
    ],
  ));
}

String _publicPhotoUrl(String value) {
  if (value.startsWith('/midia/')) return 'https://mais1km.novaagencian8n.online$value';
  if (value.startsWith('https://')) return value;
  return '';
}

String _photoType(String type) => switch (type) {
  'historica' => 'Foto histórica',
  'atual' => 'Foto atual',
  'restauracao' => 'Versão restaurada',
  _ => 'Foto do ponto',
};

class _CardArtwork extends StatelessWidget {
  const _CardArtwork({required this.card, this.detail = false});
  final NotebookCard card;
  final bool detail;

  @override
  Widget build(BuildContext context) {
    final url = _artUrl(card, detail: detail);
    return Container(
      decoration: BoxDecoration(
        color: BrandPalette.forest,
        border: Border.all(color: _rarityColor(card.rarity).withValues(alpha: .55)),
      ),
      child: url == null
          ? _ArtworkFallback(card: card)
          : Image.network(url, fit: BoxFit.cover,
              errorBuilder: (_, _, _) => _ArtworkFallback(card: card)),
    );
  }
}

class _ArtworkFallback extends StatelessWidget {
  const _ArtworkFallback({required this.card});
  final NotebookCard card;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: const BoxDecoration(
      gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight,
        colors: [BrandPalette.darkCardStrong, BrandPalette.forestDeep]),
    ),
    child: Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
      Icon(_categoryIcon(card.category), color: card.captured ? BrandPalette.gold : BrandPalette.darkMuted, size: 42),
      const SizedBox(height: 9),
      Text(card.number.toString().padLeft(3, '0'),
        style: GoogleFonts.cinzel(color: BrandPalette.gold, fontSize: 15, fontWeight: FontWeight.w800)),
      if (!card.captured) const Padding(padding: EdgeInsets.only(top: 7),
        child: Icon(Icons.lock_outline, color: BrandPalette.darkMuted, size: 18)),
    ])),
  );
}

class _DetailPill extends StatelessWidget {
  const _DetailPill({required this.label, this.color});
  final String label;
  final Color? color;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
    decoration: BoxDecoration(color: (color ?? BrandPalette.gold).withValues(alpha: .12),
      borderRadius: BorderRadius.circular(20), border: Border.all(color: (color ?? BrandPalette.gold).withValues(alpha: .5))),
    child: Text(label, style: TextStyle(color: color ?? BrandPalette.gold, fontSize: 10, fontWeight: FontWeight.w800)),
  );
}

class _CollectionPanel extends StatelessWidget {
  const _CollectionPanel({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(color: BrandPalette.darkCard, borderRadius: BorderRadius.circular(14),
      border: Border.all(color: BrandPalette.darkRule)),
    child: child,
  );
}

class _EmptyCollection extends StatelessWidget {
  const _EmptyCollection();

  @override
  Widget build(BuildContext context) => const _CollectionPanel(child: Padding(
    padding: EdgeInsets.all(10),
    child: Column(children: [
      Icon(Icons.collections_bookmark_outlined, color: BrandPalette.gold, size: 34),
      SizedBox(height: 8),
      Text('Nenhuma carta neste filtro', style: TextStyle(color: BrandPalette.cream, fontWeight: FontWeight.w800)),
      SizedBox(height: 4),
      Text('Experimente outra categoria ou volte para todas.',
        textAlign: TextAlign.center, style: TextStyle(color: BrandPalette.darkMuted, fontSize: 11)),
    ]),
  ));
}

Color _rarityColor(String rarity) => switch (rarity) {
  'lendario' => const Color(0xFFE5BD52),
  'epico' => const Color(0xFFB68AD8),
  'raro' => const Color(0xFF7FD0A4),
  _ => BrandPalette.gold,
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
  'raro' => 'Rara',
  'epico' => 'Épica',
  'lendario' => 'Lendária',
  _ => 'Comum',
};

String? _artUrl(NotebookCard card, {required bool detail}) {
  final image = detail ? (card.artLarge ?? card.artThumbnail) : card.artThumbnail;
  if (image != null && RegExp(r'^/midia/[\w.]+\.webp$').hasMatch(image)) {
    return 'https://mais1km.novaagencian8n.online$image';
  }
  final art = card.art;
  if (art != null && RegExp(r'^[\w.-]{1,80}$').hasMatch(art)) {
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

String _formatDate(DateTime value) {
  final date = value.toLocal();
  return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
}
