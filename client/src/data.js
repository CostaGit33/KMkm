export const CITY = {
  id: "eunapolis",
  name: "Eunápolis",
  season: "Caderneta de caminhos",
  totalPoints: 0,
};

export const CATEGORIES = [
  { id: "historia", name: "História", icon: "⌂", color: "red", description: "Marcos, memória e patrimônio" },
  { id: "praias", name: "Praias", icon: "≈", color: "blue", description: "Orla, mar e areia" },
  { id: "natureza", name: "Natureza", icon: "❋", color: "green", description: "Paisagens e vida natural" },
  { id: "caminhos", name: "Caminhos", icon: "⌁", color: "blue", description: "Caminhada, pedal e deslocamentos" },
  { id: "cultura", name: "Cultura", icon: "✳", color: "ochre", description: "Encontros, arte e tradições" },
  { id: "sabores", name: "Sabores", icon: "✦", color: "red", description: "Pausas para provar a cidade" },
];


export const EUNAPOLIS_DESTINATION = {
  id: "eunapolis",
  name: "Eunápolis",
  region: "Bahia",
  summary: "O antigo Km 64 cresceu no encontro das ligações BR-367 e BR-101. Emancipada em 1988, Eunápolis guarda uma história de caminhos — agora reunida neste destino do +1 KM.",
  facts: [
    { label: "Emancipação", value: "12 mai. 1988", detail: "Criação do município" },
    { label: "População", value: "113.710", detail: "Censo 2022" },
    { label: "Origem", value: "Km 64", detail: "Eixo BR-367 · BR-101" },
  ],
  sources: [
    { label: "Dados municipais · Prefeitura de Eunápolis", url: "https://www.eunapolis.ba.gov.br/site/dadosmunicipais" },
  ],
};

export const POINTS = [
  { id: "EU-001", name: "Praça da Bandeira", categoryIds: ["historia", "cultura"], icon: "✳", x: 42, y: 34, lat: -16.3751286, lng: -39.5881012, mapSource: "OpenStreetMap", note: "Praça de uso cívico em Eunápolis.", hidden: false },
  { id: "EU-002", name: "Praça da Liberdade", categoryIds: ["cultura", "natureza"], icon: "✳", x: 57, y: 28, lat: -16.373437, lng: -39.5905262, mapSource: "OpenStreetMap", note: "Espaço central requalificado.", hidden: false },
  { id: "EU-003", name: "Parque Ecológico do Gravatá", categoryIds: ["natureza", "caminhos"], icon: "❋", x: 34, y: 48, lat: -16.3697345, lng: -39.5945707, mapSource: "Google Maps", address: "Av. Ayrton Senna, 147-179 · Santa Lúcia", note: "Parque urbano com dois lagos naturais e pista de caminhada; não é cachoeira nem área de banho.", hidden: false },
  { id: "EU-004", name: "Praça do Pequi", categoryIds: ["cultura", "sabores"], icon: "✦", x: 69, y: 42, lat: -16.3714765, lng: -39.5779847, mapSource: "OpenStreetMap", note: "Praça pública com intervenções recentes.", hidden: false },
  { id: "EU-005", name: "Praça do Parque da Renovação", categoryIds: ["cultura", "natureza"], icon: "✳", x: 78, y: 55, note: "Espaço de bairro em intervenção municipal.", hidden: false },
  { id: "EU-006", name: "Praça da Colônia", categoryIds: ["cultura", "caminhos"], icon: "⌂", x: 24, y: 73, note: "Praça requalificada no distrito de Colônia.", hidden: false },
  { id: "EU-007", name: "Praça Dona Dinah Borges Moura", categoryIds: ["natureza", "caminhos"], icon: "≈", x: 63, y: 67, note: "Praça inaugurada com pista de caminhada de 160 m.", hidden: false },
  { id: "EU-008", name: "Lagoa e Academia da Saúde do Dinah Borges", categoryIds: ["natureza", "caminhos"], icon: "❋", x: 73, y: 75, note: "Pista de caminhada junto à lagoa e à Academia da Saúde do Dinah Borges.", hidden: false },
  { id: "EU-009", name: "Mercado Municipal Dona Alzira", categoryIds: ["sabores", "cultura"], icon: "✦", x: 49, y: 43, lat: -16.3710206, lng: -39.5869019, mapSource: "Google Maps", address: "Av. Dom Pedro II, 933-981 · Centro", note: "Mercado municipal que abriga a tradicional Feira do Bueiro.", hidden: false },
  { id: "EU-010", name: "Feira Livre Juca Rosa", categoryIds: ["sabores", "cultura"], icon: "✦", x: 84, y: 36, note: "Feira livre de Eunápolis.", hidden: false },
  { id: "EU-011", name: "Viola de Bolso Arte e Memória", categoryIds: ["cultura", "historia"], icon: "▤", x: 55, y: 82, lat: -16.3689627, lng: -39.5854129, mapSource: "Google Maps", address: "Praça Vereador Alcides Ferreira Pinto, 38 · Dr. Gusmão", note: "Ponto de cultura com oficinas e vivências.", hidden: false },
  { id: "EU-012", name: "Prado da Rua Paulo de Tarso", categoryIds: ["cultura", "historia"], icon: "⌂", x: 29, y: 88, note: "A corrida de cavalo é patrimônio cultural imaterial municipal.", hidden: false },
  { id: "EU-013", name: "Estrada da Colônia · ciclofaixa", categoryIds: ["caminhos", "natureza"], icon: "⌁", x: 17, y: 61, note: "Cerca de 6 km demarcados em via de tráfego misto.", hidden: false },
  { id: "EU-014", name: "Circuito Sesc de Corridas", categoryIds: ["caminhos", "cultura"], icon: "➜", x: 46, y: 20, note: "Percurso de prova do Circuito Sesc de Corridas.", hidden: false },
];


export const ROUTES = [
  { id: "eu-gravata", name: "Circuito Gravatá", subtitle: "Natureza urbana e caminhada", icon: "❋", color: "green", pointIds: ["EU-003", "EU-007", "EU-008"] },
  { id: "eu-cultura", name: "Circuito Cultural Central", subtitle: "Praças, memória, mercado e cultura", icon: "✳", color: "ochre", pointIds: ["EU-001", "EU-002", "EU-004", "EU-009", "EU-011"] },
  { id: "eu-pedal", name: "Caminho da Colônia", subtitle: "Ciclofaixa e caminhos rurais", icon: "⌁", color: "blue", pointIds: ["EU-006", "EU-013", "EU-003"] },
  { id: "eu-corrida", name: "Corrida e tradição", subtitle: "Percursos de prova e patrimônio vivo", icon: "➜", color: "red", pointIds: ["EU-014", "EU-012", "EU-001"] },
];

export const COLLECTIONS = [
  { id: "eu-cidade", name: "Minha Eunápolis", subtitle: "Cada caminho, uma evidência", icon: "✦", color: "ochre", pointIds: POINTS.map((p) => p.id) },
  { id: "eu-patrimonio", name: "Memória e cultura", subtitle: "Praças, festas e agentes locais", icon: "⌂", color: "red", pointIds: ["EU-001", "EU-002", "EU-004", "EU-009", "EU-011", "EU-012", "EU-014"] },
  { id: "eu-natureza", name: "Natureza e caminhos", subtitle: "Parques, ciclofaixa e trilhas", icon: "❋", color: "green", pointIds: ["EU-003", "EU-006", "EU-007", "EU-008", "EU-013"] },
];

CITY.totalPoints = POINTS.length;

export function getPoint(id) {
  return POINTS.find((point) => point.id === id);
}

export function findPointByCode(code) {
  const id = String(code || "").toUpperCase();
  return POINTS.find((item) => item.id === id) || null;
}

export function getCategory(id) {
  return CATEGORIES.find((category) => category.id === id);
}
