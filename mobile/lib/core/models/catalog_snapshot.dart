class CatalogPoint {
  const CatalogPoint({
    required this.code,
    required this.name,
    required this.categories,
    this.address,
    this.note,
    this.icon,
    this.cover,
    this.latitude,
    this.longitude,
  });

  final String code;
  final String name;
  final List<String> categories;
  final String? address;
  final String? note;
  final String? icon;
  final String? cover;
  final double? latitude;
  final double? longitude;

  factory CatalogPoint.fromJson(Map<String, dynamic> json) {
    final categories = json['categorias'];
    final lat = json['lat'];
    final lng = json['lng'];
    return CatalogPoint(
      code: json['codigo']?.toString() ?? '',
      name: json['nome']?.toString() ?? 'Ponto sem nome',
      categories: categories is List
          ? categories.map((item) => item.toString()).toList()
          : const [],
      address: json['endereco']?.toString(),
      note: json['nota']?.toString(),
      icon: json['icone']?.toString(),
      cover: json['capa']?.toString(),
      latitude: lat is num ? lat.toDouble() : double.tryParse('$lat'),
      longitude: lng is num ? lng.toDouble() : double.tryParse('$lng'),
    );
  }
}

class CatalogCircuit {
  const CatalogCircuit({
    required this.slug,
    required this.name,
    required this.pointCodes,
    this.subtitle,
    this.icon,
    this.color,
  });

  final String slug;
  final String name;
  final List<String> pointCodes;
  final String? subtitle;
  final String? icon;
  final String? color;

  factory CatalogCircuit.fromJson(Map<String, dynamic> json) {
    final codes = json['codigos'];
    return CatalogCircuit(
      slug: json['slug']?.toString() ?? '',
      name: json['nome']?.toString() ?? '',
      subtitle: json['subtitulo']?.toString(),
      icon: json['icone']?.toString(),
      color: json['cor']?.toString(),
      pointCodes: codes is List
          ? codes.map((item) => item.toString()).toList()
          : const [],
    );
  }
}

class CatalogSnapshot {
  const CatalogSnapshot({
    required this.points,
    required this.circuits,
  });

  final List<CatalogPoint> points;
  final List<CatalogCircuit> circuits;

  factory CatalogSnapshot.fromJson(Map<String, dynamic> json) {
    final rawPoints = json['pontos'];
    final rawCircuits = json['circuitos'];

    final points = rawPoints is List
        ? rawPoints
            .whereType<Map>()
            .map((item) => Map<String, dynamic>.from(item))
            .where((item) =>
                item['status'] == 'publicado' && item['oculto'] != true)
            .map(CatalogPoint.fromJson)
            .where((point) => point.code.isNotEmpty)
            .toList()
        : <CatalogPoint>[];

    final circuits = rawCircuits is List
        ? rawCircuits
            .whereType<Map>()
            .map((item) => Map<String, dynamic>.from(item))
            .map(CatalogCircuit.fromJson)
            .where((circuit) => circuit.slug.isNotEmpty)
            .toList()
        : <CatalogCircuit>[];

    return CatalogSnapshot(points: points, circuits: circuits);
  }
}
