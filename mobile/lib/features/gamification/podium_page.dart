import 'package:flutter/material.dart';

import '../../core/theme/brand_theme.dart';

typedef PodiumParticipationCallback = Future<void> Function({
  required bool optIn,
  required String alias,
});

/// Exibe os dados já carregados pela camada pai; não executa chamadas de API.
///
/// `podiumData` corresponde à resposta de /api/gamificacao/podio e
/// `gamificationData` à resposta de /api/gamificacao/me.
class PodiumPage extends StatefulWidget {
  const PodiumPage({
    super.key,
    required this.podiumData,
    required this.gamificationData,
    required this.loading,
    required this.onRefresh,
    required this.onSaveParticipation,
    this.error,
  });

  final Map<String, dynamic>? podiumData;
  final Map<String, dynamic>? gamificationData;
  final bool loading;
  final String? error;
  final VoidCallback onRefresh;
  final PodiumParticipationCallback onSaveParticipation;

  @override
  State<PodiumPage> createState() => _PodiumPageState();
}

class _PodiumPageState extends State<PodiumPage> {
  final _aliasController = TextEditingController();
  bool _optedIn = false;
  bool _participationInitialized = false;
  bool _savingParticipation = false;
  String? _participationMessage;
  bool _participationError = false;

  @override
  void initState() {
    super.initState();
    _syncParticipation();
  }

  @override
  void didUpdateWidget(covariant PodiumPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!identical(oldWidget.gamificationData, widget.gamificationData) ||
        !identical(oldWidget.podiumData, widget.podiumData)) {
      _syncParticipation();
    }
  }

  void _syncParticipation() {
    final profile = _mapAt(widget.gamificationData, 'participation');
    final me = _mapAt(widget.podiumData, 'me');
    final optedIn = _boolValue(profile['optedIn']) ?? _boolValue(me['optedIn']) ?? false;
    final alias = _stringValue(profile['alias']) ?? _stringValue(me['alias']) ?? '';
    if (!_participationInitialized || !_savingParticipation) {
      _optedIn = optedIn;
      _aliasController.text = alias;
      _participationInitialized = true;
    }
  }

  @override
  void dispose() {
    _aliasController.dispose();
    super.dispose();
  }

  Future<void> _saveParticipation() async {
    if (_savingParticipation) return;
    final alias = _aliasController.text.trim().replaceAll(RegExp(r'\s+'), ' ');
    if (_optedIn && (alias.length < 2 || alias.length > 30 || alias.contains('@'))) {
      setState(() {
        _participationMessage = 'Informe um apelido público de 2 a 30 caracteres, sem e-mail.';
        _participationError = true;
      });
      return;
    }
    setState(() {
      _savingParticipation = true;
      _participationMessage = null;
    });
    try {
      await widget.onSaveParticipation(optIn: _optedIn, alias: _optedIn ? alias : '');
      if (!mounted) return;
      setState(() {
        _participationMessage = _optedIn
            ? 'Sua preferência de participação foi salva.'
            : 'Você não está participando do pódio público.';
        _participationError = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _participationMessage = _errorText(error, 'Não foi possível salvar sua preferência.');
        _participationError = true;
      });
    } finally {
      if (mounted) setState(() => _savingParticipation = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final podium = widget.podiumData;
    final gamification = widget.gamificationData;
    if (widget.loading && podium == null && gamification == null) {
      return const Center(child: CircularProgressIndicator(color: BrandPalette.gold));
    }
    if (widget.error != null && podium == null && gamification == null) {
      return _LoadState(
        icon: Icons.cloud_off_outlined,
        title: 'Não foi possível carregar o pódio',
        message: widget.error!,
        actionLabel: 'Tentar novamente',
        onAction: widget.onRefresh,
      );
    }
    if (podium == null && gamification == null) {
      return _LoadState(
        icon: Icons.emoji_events_outlined,
        title: 'Pódio ainda não carregado',
        message: 'Atualize para ver as conquistas e o ranking.',
        actionLabel: 'Atualizar',
        onAction: widget.onRefresh,
      );
    }

    final xp = _mapAt(gamification, 'xp');
    final xpTotal = _intValue(xp['total']) ?? _intValue(_mapAt(podium, 'me')['xp']) ?? 0;
    final points = _intValue(xp['uniquePoints']) ?? 0;
    final routes = _intValue(xp['completedRoutes']) ?? 0;
    final levelData = _mapAt(xp, 'level');
    final currentLevel = _mapAt(levelData, 'current');
    final levelName = _stringValue(currentLevel['name']) ?? _stringValue(currentLevel['title']) ?? 'Explorador';
    final levelNumber = _intValue(currentLevel['level']) ?? _intValue(currentLevel['number']);
    final board = _listAt(podium, 'board').isNotEmpty
        ? _listAt(podium, 'board')
        : _listAt(podium, 'leaders');
    final leaders = board.take(3).toList();
    final period = _stringValue(_mapAt(podium, 'period')['label']) ??
        (_stringValue(_mapAt(podium, 'scope')['label']) ?? 'Pódio atual');

    return RefreshIndicator(
      color: BrandPalette.gold,
      onRefresh: () async => widget.onRefresh(),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(18, 18, 18, 32),
        children: [
          Row(
            children: [
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('GAMIFICAÇÃO', style: TextStyle(color: BrandPalette.gold, fontSize: 10, letterSpacing: 2, fontWeight: FontWeight.w800)),
                    SizedBox(height: 5),
                    Text('Seu pódio', style: TextStyle(color: BrandPalette.cream, fontSize: 25, fontWeight: FontWeight.w800)),
                  ],
                ),
              ),
              IconButton(
                tooltip: 'Atualizar pódio',
                onPressed: widget.loading ? null : widget.onRefresh,
                icon: widget.loading
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.refresh),
              ),
            ],
          ),
          if (widget.error != null) ...[
            const SizedBox(height: 12),
            _Notice(message: 'Os dados exibidos podem estar desatualizados. ${widget.error}', isError: true),
          ],
          const SizedBox(height: 16),
          _XpCard(
            totalXP: xpTotal,
            points: points,
            routes: routes,
            levelName: levelName,
            levelNumber: levelNumber,
            levelData: levelData,
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              const Expanded(child: Text('Pódio público', style: TextStyle(color: BrandPalette.cream, fontSize: 18, fontWeight: FontWeight.w800))),
              Text(period, style: const TextStyle(color: BrandPalette.darkMuted, fontSize: 12)),
            ],
          ),
          const SizedBox(height: 12),
          if (leaders.isEmpty)
            const _EmptyLeaders()
          else
            _LeaderList(leaders: leaders),
          const SizedBox(height: 24),
          _ParticipationCard(
            optedIn: _optedIn,
            aliasController: _aliasController,
            saving: _savingParticipation,
            message: _participationMessage,
            messageIsError: _participationError,
            onOptInChanged: (value) => setState(() {
              _optedIn = value;
              _participationMessage = null;
            }),
            onSave: _saveParticipation,
          ),
          const SizedBox(height: 24),
          _MedalsSection(medals: _listAt(gamification, 'medals')),
        ],
      ),
    );
  }
}

class _XpCard extends StatelessWidget {
  const _XpCard({
    required this.totalXP,
    required this.points,
    required this.routes,
    required this.levelName,
    required this.levelNumber,
    required this.levelData,
  });

  final int totalXP;
  final int points;
  final int routes;
  final String levelName;
  final int? levelNumber;
  final Map<String, dynamic> levelData;

  @override
  Widget build(BuildContext context) {
    final next = _mapAt(levelData, 'next');
    final progress = _doubleValue(levelData['progress']) ??
        _doubleValue(levelData['percent']) ??
        _doubleValue(levelData['progressToNext']) ??
        0;
    final safeProgress = (progress > 1 ? progress / 100 : progress)
        .clamp(0.0, 1.0)
        .toDouble();
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: BrandPalette.gold.withValues(alpha: .55)),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [BrandPalette.darkCardStrong, BrandPalette.darkSurface],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: const BoxDecoration(color: BrandPalette.gold, shape: BoxShape.circle),
                child: const Icon(Icons.bolt, color: BrandPalette.forestDeep, size: 28),
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Seu XP', style: TextStyle(color: BrandPalette.darkMuted, fontSize: 12)),
                    Text('$totalXP XP', style: const TextStyle(color: BrandPalette.cream, fontSize: 26, fontWeight: FontWeight.w800)),
                  ],
                ),
              ),
              if (levelNumber != null)
                _Tag(label: 'NÍVEL $levelNumber'),
            ],
          ),
          const SizedBox(height: 14),
          Text(levelName, style: const TextStyle(color: BrandPalette.gold, fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: safeProgress,
              minHeight: 8,
              backgroundColor: BrandPalette.darkRule,
              color: BrandPalette.gold,
            ),
          ),
          if (_stringValue(next['name']) != null || _intValue(next['level']) != null) ...[
            const SizedBox(height: 7),
            Text('Próximo nível: ${_stringValue(next['name']) ?? _intValue(next['level'])}', style: const TextStyle(color: BrandPalette.darkMuted, fontSize: 11)),
          ],
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(child: _XpMetric(value: '$points', label: 'pontos únicos', icon: Icons.place_outlined)),
              const SizedBox(width: 8),
              Expanded(child: _XpMetric(value: '$routes', label: 'rotas concluídas', icon: Icons.route_outlined)),
            ],
          ),
        ],
      ),
    );
  }
}

class _XpMetric extends StatelessWidget {
  const _XpMetric({required this.value, required this.label, required this.icon});
  final String value;
  final String label;
  final IconData icon;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(color: BrandPalette.forestDeep.withValues(alpha: .55), borderRadius: BorderRadius.circular(12)),
        child: Row(
          children: [
            Icon(icon, size: 18, color: BrandPalette.gold),
            const SizedBox(width: 7),
            Flexible(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(value, style: const TextStyle(color: BrandPalette.cream, fontWeight: FontWeight.w800)),
              Text(label, style: const TextStyle(color: BrandPalette.darkMuted, fontSize: 10), maxLines: 1, overflow: TextOverflow.ellipsis),
            ])),
          ],
        ),
      );
}

class _LeaderList extends StatelessWidget {
  const _LeaderList({required this.leaders});
  final List<Map<String, dynamic>> leaders;

  @override
  Widget build(BuildContext context) => Column(
        children: [
          ...leaders.asMap().entries.map((entry) {
            final row = entry.value;
            final rank = _intValue(row['rank']) ?? entry.key + 1;
            final alias = _stringValue(row['alias']) ?? 'Viajante';
            final xp = _intValue(row['xp']) ?? _intValue(row['seasonXP']) ?? 0;
            final points = _intValue(row['uniquePoints']);
            final isMe = row['isMe'] == true;
            final color = rank == 1 ? BrandPalette.gold : BrandPalette.darkMuted;
            return Container(
              margin: const EdgeInsets.only(bottom: 9),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: isMe ? BrandPalette.darkCardStrong : BrandPalette.darkSurface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: rank == 1 ? BrandPalette.gold.withValues(alpha: .65) : BrandPalette.darkRule),
              ),
              child: Row(
                children: [
                  SizedBox(width: 36, child: Text('#$rank', style: TextStyle(color: color, fontWeight: FontWeight.w900, fontSize: 17))),
                  Icon(rank == 1 ? Icons.emoji_events : Icons.person_outline, color: color, size: 21),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(isMe ? '$alias · você' : alias, style: const TextStyle(color: BrandPalette.cream, fontWeight: FontWeight.w700), maxLines: 1, overflow: TextOverflow.ellipsis),
                        if (points != null) Text('$points pontos únicos', style: const TextStyle(color: BrandPalette.darkMuted, fontSize: 11)),
                      ],
                    ),
                  ),
                  Text('$xp XP', style: const TextStyle(color: BrandPalette.gold, fontWeight: FontWeight.w800)),
                ],
              ),
            );
          }),
        ],
      );
}

class _ParticipationCard extends StatelessWidget {
  const _ParticipationCard({
    required this.optedIn,
    required this.aliasController,
    required this.saving,
    required this.message,
    required this.messageIsError,
    required this.onOptInChanged,
    required this.onSave,
  });

  final bool optedIn;
  final TextEditingController aliasController;
  final bool saving;
  final String? message;
  final bool messageIsError;
  final ValueChanged<bool> onOptInChanged;
  final VoidCallback onSave;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: BrandPalette.darkSurface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: BrandPalette.darkRule),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Sua participação', style: TextStyle(color: BrandPalette.cream, fontSize: 17, fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            const Text('A participação é opcional. No ranking, outras pessoas veem seu apelido público e seus pontos.', style: TextStyle(color: BrandPalette.darkMuted, height: 1.4, fontSize: 12)),
            const SizedBox(height: 8),
            SwitchListTile.adaptive(
              contentPadding: EdgeInsets.zero,
              title: const Text('Participar do pódio público'),
              value: optedIn,
              onChanged: saving ? null : onOptInChanged,
              activeColor: BrandPalette.gold,
            ),
            if (optedIn) ...[
              const SizedBox(height: 4),
              TextField(
                controller: aliasController,
                enabled: !saving,
                maxLength: 30,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(labelText: 'Apelido público', hintText: 'Como quer aparecer no ranking?'),
              ),
            ],
            if (message != null) ...[
              const SizedBox(height: 8),
              _Notice(message: message!, isError: messageIsError),
            ],
            const SizedBox(height: 10),
            FilledButton(
              onPressed: saving ? null : onSave,
              style: FilledButton.styleFrom(backgroundColor: BrandPalette.gold, foregroundColor: BrandPalette.forestDeep),
              child: Text(saving ? 'Salvando…' : 'Salvar preferência'),
            ),
          ],
        ),
      );
}

class _MedalsSection extends StatelessWidget {
  const _MedalsSection({required this.medals});
  final List<Map<String, dynamic>> medals;

  @override
  Widget build(BuildContext context) {
    if (medals.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Conquistas', style: TextStyle(color: BrandPalette.cream, fontSize: 18, fontWeight: FontWeight.w800)),
        const SizedBox(height: 10),
        ...medals.map((medal) {
          final earned = medal['earned'] == true;
          final progress = _mapAt(medal, 'progress');
          final name = _stringValue(medal['name']) ?? 'Conquista';
          final icon = _stringValue(medal['icon']) ?? '✦';
          final description = _stringValue(medal['description']);
          final current = _intValue(progress['current']) ?? 0;
          final target = _intValue(progress['target']) ?? 0;
          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: BrandPalette.darkSurface, borderRadius: BorderRadius.circular(12), border: Border.all(color: BrandPalette.darkRule)),
            child: Row(
              children: [
                Text(icon, style: TextStyle(color: earned ? BrandPalette.gold : BrandPalette.darkMuted, fontSize: 22)),
                const SizedBox(width: 11),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(name, style: const TextStyle(color: BrandPalette.cream, fontWeight: FontWeight.w700)),
                  if (description != null)
                    Text(description, style: const TextStyle(color: BrandPalette.darkMuted, fontSize: 11)),
                ])),
                Text(earned ? 'Conquistada' : '$current/$target', style: TextStyle(color: earned ? BrandPalette.gold : BrandPalette.darkMuted, fontSize: 11, fontWeight: FontWeight.w700)),
              ],
            ),
          );
        }),
      ],
    );
  }
}

class _EmptyLeaders extends StatelessWidget {
  const _EmptyLeaders();

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(color: BrandPalette.darkSurface, borderRadius: BorderRadius.circular(14), border: Border.all(color: BrandPalette.darkRule)),
        child: const Column(
          children: [
            Icon(Icons.emoji_events_outlined, size: 34, color: BrandPalette.gold),
            SizedBox(height: 8),
            Text('Ainda não há participantes neste pódio.', textAlign: TextAlign.center, style: TextStyle(color: BrandPalette.cream, fontWeight: FontWeight.w700)),
            SizedBox(height: 4),
            Text('Você pode ser a primeira pessoa a participar.', textAlign: TextAlign.center, style: TextStyle(color: BrandPalette.darkMuted, fontSize: 12)),
          ],
        ),
      );
}

class _LoadState extends StatelessWidget {
  const _LoadState({required this.icon, required this.title, required this.message, required this.actionLabel, required this.onAction});
  final IconData icon;
  final String title;
  final String message;
  final String actionLabel;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 48, color: BrandPalette.gold),
              const SizedBox(height: 14),
              Text(title, textAlign: TextAlign.center, style: const TextStyle(color: BrandPalette.cream, fontWeight: FontWeight.w800, fontSize: 18)),
              const SizedBox(height: 7),
              Text(message, textAlign: TextAlign.center, style: const TextStyle(color: BrandPalette.darkMuted, height: 1.45)),
              const SizedBox(height: 14),
              FilledButton(onPressed: onAction, child: Text(actionLabel)),
            ],
          ),
        ),
      );
}

class _Notice extends StatelessWidget {
  const _Notice({required this.message, required this.isError});
  final String message;
  final bool isError;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(11),
        decoration: BoxDecoration(
          color: isError ? BrandPalette.darkDanger.withValues(alpha: .12) : BrandPalette.darkGreen.withValues(alpha: .16),
          borderRadius: BorderRadius.circular(11),
          border: Border.all(color: isError ? BrandPalette.darkDanger : BrandPalette.darkGreen),
        ),
        child: Text(message, style: TextStyle(color: isError ? BrandPalette.darkDanger : BrandPalette.cream, height: 1.4, fontSize: 12)),
      );
}

class _Tag extends StatelessWidget {
  const _Tag({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
        decoration: BoxDecoration(color: BrandPalette.forestDeep, borderRadius: BorderRadius.circular(20), border: Border.all(color: BrandPalette.darkRule)),
        child: Text(label, style: const TextStyle(color: BrandPalette.gold, fontSize: 10, fontWeight: FontWeight.w800)),
      );
}

Map<String, dynamic> _mapAt(Map<String, dynamic>? source, String key) {
  final value = source?[key];
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return value.map((key, value) => MapEntry(key.toString(), value));
  return <String, dynamic>{};
}

List<Map<String, dynamic>> _listAt(Map<String, dynamic>? source, String key) {
  final value = source?[key];
  if (value is! List) return const [];
  return value.whereType<Map>().map((row) => row.map((key, value) => MapEntry(key.toString(), value))).toList();
}

String? _stringValue(Object? value) => value == null ? null : value.toString();

bool? _boolValue(Object? value) => value is bool ? value : null;

int? _intValue(Object? value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '');
}

double? _doubleValue(Object? value) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString() ?? '');
}

String _errorText(Object error, String fallback) {
  final text = error.toString().trim();
  return text.isEmpty || text == 'Exception' ? fallback : text.replaceFirst(RegExp(r'^Exception: '), '');
}
