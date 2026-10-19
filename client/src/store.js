import { findPointByCode } from "./data.js";

const STORAGE_KEY = "mais1km-eunapolis:v4";
// Chaves antigas (versões com outras cidades): lidas uma vez para não perder conta e carimbos.
const LEGACY_STORAGE_KEYS = ["caderneta-porto-seguro:v3", "caderneta-porto-seguro:v1"];
const CITY_ID = "eunapolis";

function makeInitialState() {
  const now = Date.now();
  return {
    version: 4,
    user: { name: "Viajante" },
    cityId: CITY_ID,
    // Tema escuro é o padrão; o claro só vale se a pessoa escolheu (themeChosen).
    theme: "dark",
    themeChosen: false,
    // Conta nova começa sem carimbos: só o servidor confirma conquistas reais.
    conquered: [],
    discovered: [],
    history: [],
    account: null,
    session: false,
    updatedAt: new Date(now).toISOString(),
  };
}

// Estados antigos podem guardar ids de outras cidades; só entram pontos que existem no catálogo de Eunápolis.
const onlyKnownPoints = (ids) => [...new Set(ids.filter((id) => typeof id === "string" && findPointByCode(id)).map((id) => findPointByCode(id).id))];

function normalizeState(value) {
  const initial = makeInitialState();
  if (!value || typeof value !== "object" || ![1, 2, 3, 4].includes(value.version)) return initial;
  const conquered = Array.isArray(value.conquered) ? onlyKnownPoints(value.conquered) : [];
  const discovered = Array.isArray(value.discovered) ? onlyKnownPoints([...value.discovered, ...conquered]) : [...conquered];
  const history = Array.isArray(value.history)
    ? value.history.filter((entry) => entry && typeof entry.pointId === "string" && findPointByCode(entry.pointId) && typeof entry.at === "string").slice(-100)
    : [];
  return {
    version: 4,
    user: { name: String(value.user?.name || "Viajante").slice(0, 36) },
    cityId: CITY_ID,
    theme: value.themeChosen === true && value.theme === "light" ? "light" : "dark",
    themeChosen: value.themeChosen === true,
    conquered,
    discovered,
    history,
    account: normalizeAccount(value.account),
    session: !!normalizeAccount(value.account) && value.session === true,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString(),
  };
}

function parseStoredState(raw) {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object" || ![1, 2, 3, 4].includes(value.version)) return null;
    if (!Array.isArray(value.conquered) || !Array.isArray(value.discovered) || !Array.isArray(value.history)) return null;
    return normalizeState(value);
  } catch {
    return null;
  }
}

function save(state) {
  const next = { ...state, version: 4, updatedAt: new Date().toISOString() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch (error) {
    console.warn("Não foi possível persistir a caderneta neste navegador.", error);
    return next;
  }
}

export function loadState() {
  try {
    const current = parseStoredState(localStorage.getItem(STORAGE_KEY));
    if (current) return save(current);
    for (const key of LEGACY_STORAGE_KEYS) {
      const legacy = parseStoredState(localStorage.getItem(key));
      if (legacy) return save(legacy);
    }
    return save(makeInitialState());
  } catch (error) {
    console.warn("Estado local inválido; iniciando uma nova caderneta.", error);
    return save(makeInitialState());
  }
}

export function revealPoint(state, pointId) {
  if (state.discovered.includes(pointId)) return state;
  return save({ ...state, discovered: [...state.discovered, pointId] });
}

export function setTheme(state, theme) {
  return save({ ...state, theme: theme === "light" ? "light" : "dark", themeChosen: true });
}

export function resetLocalState(current = null) {
  try {
    localStorage.removeItem(STORAGE_KEY);
    for (const key of LEGACY_STORAGE_KEYS) localStorage.removeItem(key);
  } catch {}
  // Limpa os dados deste aparelho; excluir conta passa current = null
  const fresh = makeInitialState();
  const account = current?.account || null;
  return save({
    ...fresh,
    account,
    session: !!account && current?.session === true,
    user: account ? { ...fresh.user, name: account.nome } : fresh.user,
  });
}

function normalizeAccount(value) {
  if (!value || typeof value !== "object") return null;
  const nome = String(value.nome || "").trim().slice(0, 36);
  const email = String(value.email || "").trim().toLowerCase().slice(0, 120);
  if (nome.length < 2 || !email || typeof value.salt !== "string" || typeof value.hash !== "string") return null;
  return {
    nome,
    email,
    salt: value.salt,
    hash: value.hash,
    alg: value.alg === "fnv1a" ? "fnv1a" : "sha256",
    criadoEm: typeof value.criadoEm === "string" ? value.criadoEm : new Date().toISOString(),
  };
}

export const isSignedIn = (state) => !!(state.account && state.session);

export function createAccount(state, account) {
  return save({ ...state, account, session: true, user: { ...state.user, name: account.nome } });
}

export function signIn(state) {
  return save({ ...state, session: true, user: { ...state.user, name: state.account.nome } });
}

export function signOut(state) {
  return save({ ...state, session: false });
}

export function updateAccount(state, patch) {
  const account = { ...state.account, ...patch };
  return save({ ...state, account, user: { ...state.user, name: account.nome } });
}

// A coleção do servidor é a fonte de verdade. O estado local abaixo é apenas uma
// projeção para mapa, rotas e uso offline; não cria nem confirma conquistas.
export function syncServerCollection(state, collection) {
  const itens = Array.isArray(collection?.itens) ? collection.itens : [];
  const conquistados = itens.filter((item) => item?.capturada === true && findPointByCode(item.codigo));
  const conquered = onlyKnownPoints(conquistados.map((item) => item.codigo));
  const discovered = onlyKnownPoints([...state.discovered, ...conquered]);
  const history = conquistados
    .filter((item) => typeof item.capturada_em === "string" && Number.isFinite(Date.parse(item.capturada_em)))
    .map((item) => ({ pointId: findPointByCode(item.codigo).id, at: new Date(item.capturada_em).toISOString(), kind: "point" }))
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
    .slice(-100);
  const changed = JSON.stringify([state.conquered, state.discovered, state.history]) !== JSON.stringify([conquered, discovered, history]);
  return changed ? { state: save({ ...state, conquered, discovered, history }), changed: true } : { state, changed: false };
}
