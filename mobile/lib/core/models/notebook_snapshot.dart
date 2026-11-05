class NotebookStamp {
  const NotebookStamp({required this.createdAt, this.name, this.order});

  final DateTime? createdAt;
  final String? name;
  final int? order;

  factory NotebookStamp.fromJson(dynamic value) {
    if (value is! Map) return const NotebookStamp(createdAt: null);
    final rawDate = value['criado_em'];
    return NotebookStamp(
      createdAt: rawDate == null ? null : DateTime.tryParse(rawDate.toString()),
      name: value['tag_nome']?.toString(),
      order: int.tryParse(value['ordem']?.toString() ?? ''),
    );
  }
}

class NotebookRoutePoint {
  const NotebookRoutePoint({
    required this.code,
    required this.name,
    required this.order,
    required this.published,
    this.stamp,
  });

  final String code;
  final String name;
  final int order;
  final bool published;
  final NotebookStamp? stamp;

  bool get completed => stamp != null;

  factory NotebookRoutePoint.fromJson(Map<String, dynamic> json) {
    final rawStamp = json['carimbo'];
    return NotebookRoutePoint(
      code: json['codigo']?.toString() ?? '',
      name: json['tag_nome']?.toString() ?? 'Ponto sem nome',
      order: int.tryParse(json['ordem']?.toString() ?? '') ?? 0,
      published: json['status']?.toString() == 'publicado',
      stamp: rawStamp is Map ? NotebookStamp.fromJson(rawStamp) : null,
    );
  }
}

class NotebookRoute {
  const NotebookRoute({
    required this.id,
    required this.name,
    required this.points,
    required this.status,
    this.color,
    this.kilometers,
  });

  final int id;
  final String name;
  final String status;
  final String? color;
  final double? kilometers;
  final List<NotebookRoutePoint> points;

  int get completed => points.where((point) => point.completed).length;
  int get total => points.length;
  int get remaining => total - completed;
  double get progress => total == 0 ? 0 : completed / total;
  bool get isComplete => total > 0 && completed == total;

  factory NotebookRoute.fromJson(Map<String, dynamic> json) {
    final rawPoints = json['pontos'];
    final points = rawPoints is List
        ? rawPoints
            .whereType<Map>()
            .map((item) => NotebookRoutePoint.fromJson(
                  Map<String, dynamic>.from(item),
                ))
            .toList()
        : <NotebookRoutePoint>[];
    points.sort((a, b) => a.order.compareTo(b.order));
    return NotebookRoute(
      id: int.tryParse(json['id']?.toString() ?? '') ?? 0,
      name: json['nome']?.toString() ?? 'Rota sem nome',
      status: json['status']?.toString() ?? '',
      color: json['cor']?.toString(),
      kilometers: json['km'] is num
          ? (json['km'] as num).toDouble()
          : double.tryParse(json['km']?.toString() ?? ''),
      points: points,
    );
  }
}

class NotebookCard {
  const NotebookCard({
    required this.code,
    required this.pointName,
    required this.number,
    required this.category,
    required this.rarity,
    required this.captured,
    this.creature,
    this.phrase,
    this.story,
    this.art,
    this.artThumbnail,
    this.artLarge,
    this.capturedAt,
  });

  final String code;
  final String pointName;
  final int number;
  final String category;
  final String rarity;
  final bool captured;
  final String? creature;
  final String? phrase;
  final String? story;
  final String? art;
  final String? artThumbnail;
  final String? artLarge;
  final DateTime? capturedAt;

  factory NotebookCard.fromJson(Map<String, dynamic> json) {
    final photo = json['arte_foto'];
    final rawDate = json['capturada_em'];
    return NotebookCard(
      code: json['codigo']?.toString() ?? '',
      pointName: json['ponto']?.toString() ?? 'Ponto sem nome',
      number: int.tryParse(json['carta']?.toString() ?? '') ?? 0,
      category: json['categoria']?.toString() ?? 'cultura',
      rarity: json['raridade']?.toString() ?? 'comum',
      captured: json['capturada'] == true,
      creature: json['criatura']?.toString(),
      phrase: json['frase']?.toString(),
      story: json['historia']?.toString(),
      art: json['arte']?.toString(),
      artThumbnail: photo is Map ? photo['m']?.toString() : null,
      artLarge: photo is Map ? photo['g']?.toString() : null,
      capturedAt: rawDate == null ? null : DateTime.tryParse(rawDate.toString()),
    );
  }
}

class NotebookEventPoint {
  const NotebookEventPoint({
    required this.code,
    required this.name,
    required this.completed,
  });

  final String code;
  final String name;
  final bool completed;

  factory NotebookEventPoint.fromJson(Map<String, dynamic> json) {
    return NotebookEventPoint(
      code: json['codigo']?.toString() ?? '',
      name: json['tag_nome']?.toString() ?? 'Ponto',
      completed: json['carimbo'] != null,
    );
  }
}

class NotebookEvent {
  const NotebookEvent({
    required this.slug,
    required this.name,
    required this.type,
    required this.state,
    required this.completed,
    required this.total,
    required this.points,
    this.description,
    this.sponsor,
    this.startAt,
    this.endAt,
    this.edition,
  });

  final String slug;
  final String name;
  final String type;
  final String state;
  final int completed;
  final int total;
  final List<NotebookEventPoint> points;
  final String? description;
  final String? sponsor;
  final DateTime? startAt;
  final DateTime? endAt;
  final Map<String, dynamic>? edition;

  double get progress => total == 0 ? 0 : completed / total;

  factory NotebookEvent.fromJson(Map<String, dynamic> json) {
    final rawPoints = json['pontos'];
    final rawEdition = json['edicao'];
    return NotebookEvent(
      slug: json['slug']?.toString() ?? '',
      name: json['nome']?.toString() ?? 'Evento',
      type: json['tipo']?.toString() ?? 'evento',
      state: json['estado']?.toString() ?? 'encerrado',
      completed: int.tryParse(json['feitos']?.toString() ?? '') ?? 0,
      total: int.tryParse(json['total']?.toString() ?? '') ?? 0,
      points: rawPoints is List
          ? rawPoints
              .whereType<Map>()
              .map((item) => NotebookEventPoint.fromJson(
                    Map<String, dynamic>.from(item),
                  ))
              .toList()
          : <NotebookEventPoint>[],
      description: json['descricao']?.toString(),
      sponsor: json['patrocinado_por']?.toString(),
      startAt: json['inicio_em'] == null
          ? null
          : DateTime.tryParse(json['inicio_em'].toString()),
      endAt: json['fim_em'] == null
          ? null
          : DateTime.tryParse(json['fim_em'].toString()),
      edition: rawEdition is Map
          ? Map<String, dynamic>.from(rawEdition)
          : null,
    );
  }
}

class NotebookSnapshot {
  const NotebookSnapshot({
    required this.routes,
    required this.cards,
    required this.events,
    required this.totalCards,
    required this.capturedCards,
    required this.categories,
    this.alias,
  });

  final List<NotebookRoute> routes;
  final List<NotebookCard> cards;
  final List<NotebookEvent> events;
  final int totalCards;
  final int capturedCards;
  final Map<String, Map<String, int>> categories;
  final String? alias;

  int get totalRoutePoints =>
      routes.fold(0, (sum, route) => sum + route.total);
  int get capturedRoutePoints =>
      routes.fold(0, (sum, route) => sum + route.completed);
  int get completedRoutes => routes.where((route) => route.isComplete).length;
  double get progress =>
      totalCards == 0 ? 0 : capturedCards / totalCards;

  factory NotebookSnapshot.fromJson(Map<String, dynamic> json) {
    final rawCollection = json['colecao'];
    final collection = rawCollection is Map
        ? Map<String, dynamic>.from(rawCollection)
        : <String, dynamic>{};
    final rawRoutes = json['rotas'];
    final rawCards = collection['itens'];
    final rawEvents = json['eventos'];
    final rawCategories = collection['por_categoria'];
    final categories = <String, Map<String, int>>{};
    if (rawCategories is Map) {
      for (final entry in rawCategories.entries) {
        if (entry.value is Map) {
          final value = Map<String, dynamic>.from(entry.value as Map);
          categories[entry.key.toString()] = {
            'total': int.tryParse(value['total']?.toString() ?? '') ?? 0,
            'capturadas':
                int.tryParse(value['capturadas']?.toString() ?? '') ?? 0,
          };
        }
      }
    }
    return NotebookSnapshot(
      alias: (json['usuario'] is Map)
          ? (json['usuario'] as Map)['apelido']?.toString()
          : null,
      routes: rawRoutes is List
          ? rawRoutes
              .whereType<Map>()
              .map((item) => NotebookRoute.fromJson(
                    Map<String, dynamic>.from(item),
                  ))
              .toList()
          : <NotebookRoute>[],
      cards: rawCards is List
          ? rawCards
              .whereType<Map>()
              .map((item) => NotebookCard.fromJson(
                    Map<String, dynamic>.from(item),
                  ))
              .toList()
          : <NotebookCard>[],
      events: rawEvents is List
          ? rawEvents
              .whereType<Map>()
              .map((item) => NotebookEvent.fromJson(
                    Map<String, dynamic>.from(item),
                  ))
              .toList()
          : <NotebookEvent>[],
      totalCards:
          int.tryParse(collection['total']?.toString() ?? '') ?? 0,
      capturedCards:
          int.tryParse(collection['capturadas']?.toString() ?? '') ?? 0,
      categories: categories,
    );
  }
}
