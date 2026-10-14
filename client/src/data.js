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
  event: {
    name: "Circuito Sesc de Corridas",
    date: "28 set. 2025",
    start: "Praça da Bandeira",
    routes: [
      { distance: "3 km", returnPoint: "Casa Trancoso", note: "Distância publicada para a prova." },
      { distance: "5 km", returnPoint: "Rancho Filó", note: "A edição também anunciou categoria PCD neste percurso." },
      { distance: "10 km", returnPoint: "Fazenda do Grupo Japonesa", note: "Passagem pela ladeira após a Prosegur." },
    ],
  },
  outdoorSpot: {
    name: "Parque Gravatá",
    note: "A Prefeitura registrou uma ação pública de saúde e valorização da vida no Parque Gravatá em 2026. A fonte não confirma trilhas, horários regulares ou condições atuais de visita.",
  },
  strava: {
    walkHeatmap: "https://www.strava.com/maps/global-heatmap?sport=Walk&style=standard&terrain=false&labels=true&poi=true&cPhotos=true&3d=false&gColor=mobileblue&gOpacity=100#14.99/-16.3766/-39.5864",
    rideHeatmap: "https://www.strava.com/maps/global-heatmap?sport=Ride&style=standard&terrain=false&labels=true&poi=true&cPhotos=true&3d=false&gColor=mobileblue&gOpacity=100#14.99/-16.3766/-39.5864",
    maps: "https://www.strava.com/maps",
    communityHelp: "https://support.strava.com/pt/articles/15401756-como-funcionam-as-rotas-da-comunidade-no-strava",
  },
  sources: [
    { label: "Dados municipais · Prefeitura de Eunápolis", url: "https://www.eunapolis.ba.gov.br/site/dadosmunicipais" },
    { label: "Circuito Sesc 2025 · Prefeitura de Eunápolis", url: "https://www.eunapolis.ba.gov.br/site/Noticias/noticia-240920251645191633-Com-apoio-da-Prefeitura-de-Eun-polis-etapa-do-Circuito-Sesc-de-Corridas-a" },
    { label: "Parque Gravatá · Prefeitura de Eunápolis", url: "https://www.eunapolis.ba.gov.br/site/Noticias/noticia-170920261449161633-Prefeitura-de-Eun-polis-promove-a-o-de-sa-de-e-valoriza-o-da-vida-no-Parq" },
    { label: "Rotas da comunidade · Strava", url: "https://support.strava.com/pt/articles/15401756-como-funcionam-as-rotas-da-comunidade-no-strava" },
  ],
};

export const JOURNEY_DAYS = 90;
export const JOURNEY_NAME = "Caminhos de Eunápolis";

export const JOURNEY_STAGES = [
  { id: "eunapolis", cityId: "eunapolis", cityName: "Eunápolis", subtitle: "Abra os caminhos da cidade.", kind: "new-points", target: 2 },
];

export const POINTS = [
  { id: "EU-001", name: "Praça da Bandeira", categoryIds: ["historia", "cultura"], icon: "✳", x: 42, y: 34, lat: -16.3751286, lng: -39.5881012, mapSource: "OpenStreetMap", note: "Uso cívico confirmado pela Prefeitura; coordenada conferida no OpenStreetMap, operação deve ser validada localmente.", hidden: false },
  { id: "EU-002", name: "Praça da Liberdade", categoryIds: ["cultura", "natureza"], icon: "✳", x: 57, y: 28, lat: -16.373437, lng: -39.5905262, mapSource: "OpenStreetMap", note: "Espaço central requalificado; coordenada conferida no OpenStreetMap, operação deve ser validada localmente.", hidden: false },
  { id: "EU-003", name: "Parque Ecológico do Gravatá", categoryIds: ["natureza", "caminhos"], icon: "❋", x: 34, y: 48, lat: -16.3697345, lng: -39.5945707, mapSource: "Google Maps · a validar em campo", address: "Av. Ayrton Senna, 147-179 · Santa Lúcia", note: "Parque urbano com dois lagos naturais e pista de caminhada; não é cachoeira nem área de banho.", hidden: false },
  { id: "EU-004", name: "Praça do Pequi", categoryIds: ["cultura", "sabores"], icon: "✦", x: 69, y: 42, lat: -16.3714765, lng: -39.5779847, mapSource: "OpenStreetMap", note: "Praça pública com intervenções recentes; coordenada conferida no OpenStreetMap, operação deve ser validada localmente.", hidden: false },
  { id: "EU-005", name: "Praça do Parque da Renovação", categoryIds: ["cultura", "natureza"], icon: "✳", x: 78, y: 55, note: "Espaço de bairro em intervenção municipal; endereço e operação ainda pendentes.", hidden: false },
  { id: "EU-006", name: "Praça da Colônia", categoryIds: ["cultura", "caminhos"], icon: "⌂", x: 24, y: 73, note: "Praça requalificada no distrito de Colônia.", hidden: false },
  { id: "EU-007", name: "Praça Dona Dinah Borges Moura", categoryIds: ["natureza", "caminhos"], icon: "≈", x: 63, y: 67, note: "Praça inaugurada com pista de caminhada de 160 m; validar condição atual.", hidden: false },
  { id: "EU-008", name: "Lagoa e Academia da Saúde do Dinah Borges", categoryIds: ["natureza", "caminhos"], icon: "❋", x: 73, y: 75, note: "Pista de caminhada documentada em restauração, sem quilometragem oficial publicada.", hidden: false },
  { id: "EU-009", name: "Mercado Municipal Dona Alzira", categoryIds: ["sabores", "cultura"], icon: "✦", x: 49, y: 43, lat: -16.3710206, lng: -39.5869019, mapSource: "Google Maps · a validar em campo", address: "Av. Dom Pedro II, 933-981 · Centro", note: "Feira do Bueiro tradicional; reforma e horário atual precisam de confirmação.", hidden: false },
  { id: "EU-010", name: "Feira Livre Juca Rosa", categoryIds: ["sabores", "cultura"], icon: "✦", x: 84, y: 36, note: "Localização secundária por diretório; validar calendário e funcionamento.", hidden: false },
  { id: "EU-011", name: "Viola de Bolso Arte e Memória", categoryIds: ["cultura", "historia"], icon: "▤", x: 55, y: 82, lat: -16.3689627, lng: -39.5854129, mapSource: "Google Maps · a validar em campo", address: "Praça Vereador Alcides Ferreira Pinto, 38 · Dr. Gusmão", note: "Ponto de cultura com oficinas e vivências; contato prévio recomendado.", hidden: false },
  { id: "EU-012", name: "Prado da Rua Paulo de Tarso", categoryIds: ["cultura", "historia"], icon: "⌂", x: 29, y: 88, note: "A corrida de cavalo é patrimônio cultural imaterial municipal.", hidden: false },
  { id: "EU-013", name: "Estrada da Colônia · ciclofaixa", categoryIds: ["caminhos", "natureza"], icon: "⌁", x: 17, y: 61, note: "Cerca de 6 km demarcados em via de tráfego misto; endpoints e segurança pendentes.", hidden: false },
  { id: "EU-014", name: "Circuito Sesc de Corridas", categoryIds: ["caminhos", "cultura"], icon: "➜", x: 46, y: 20, note: "Percurso eventual de 2026; não é circuito cotidiano.", hidden: false },
  { id: "EU-017", name: "Cruz da primeira missa", categoryIds: ["historia"], icon: "?", x: 37, y: 25, note: "Marco proposto; a sanção final do projeto de lei ainda precisa ser confirmada.", hidden: true },
  { id: "EU-018", name: "Circuito cultural central", categoryIds: ["cultura", "sabores"], icon: "✦", x: 59, y: 51, note: "Proposta editorial entre praças, mercado e cultura; não é rota oficial.", hidden: true },
  { id: "EU-019", name: "Track comunitário de pedal", categoryIds: ["caminhos"], icon: "⌁", x: 14, y: 31, note: "Candidato do Wikiloc sem validação de acesso, superfície ou segurança.", hidden: true },
  { id: "EU-020", name: "Ponto de validação de campo", categoryIds: ["caminhos"], icon: "?", x: 82, y: 17, note: "Página reservada para confirmar novos caminhos e pontos com atores locais.", hidden: true },
];


export const ROUTES = [
  { id: "eu-gravata", name: "Circuito Gravatá", subtitle: "Natureza urbana e caminhada", icon: "❋", color: "green", pointIds: ["EU-003", "EU-007", "EU-008"] },
  { id: "eu-cultura", name: "Circuito Cultural Central", subtitle: "Praças, memória, mercado e cultura", icon: "✳", color: "ochre", pointIds: ["EU-001", "EU-002", "EU-004", "EU-009", "EU-011", "EU-018"] },
  { id: "eu-pedal", name: "Caminho da Colônia", subtitle: "Ciclofaixa e caminhos rurais", icon: "⌁", color: "blue", pointIds: ["EU-006", "EU-013", "EU-003", "EU-019"] },
  { id: "eu-corrida", name: "Corrida e tradição", subtitle: "Percursos de prova e patrimônio vivo", icon: "➜", color: "red", pointIds: ["EU-014", "EU-012", "EU-001"] },
];

export const COLLECTIONS = [
  { id: "eu-cidade", name: "Minha Eunápolis", subtitle: "Cada caminho, uma evidência", icon: "✦", color: "ochre", pointIds: POINTS.map((p) => p.id) },
  { id: "eu-patrimonio", name: "Memória e cultura", subtitle: "Praças, festas e agentes locais", icon: "⌂", color: "red", pointIds: ["EU-001", "EU-002", "EU-004", "EU-009", "EU-011", "EU-012", "EU-014", "EU-017"] },
  { id: "eu-natureza", name: "Natureza e caminhos", subtitle: "Parques, ciclofaixa e trilhas", icon: "❋", color: "green", pointIds: ["EU-003", "EU-006", "EU-007", "EU-008", "EU-013", "EU-019"] },
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
