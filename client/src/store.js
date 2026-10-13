import {
  createJourneyState,
  journeyClock,
  normalizeJourneyState,
  recordJourneyMilestone as recordJourneyMilestoneState,
  recordJourneyPoint as recordJourneyPointState,
  refreshJourneyCycle,
  startJourneyCycle,
} from "./journey.js";
import { findPointByCode } from "./data.js";

const STORAGE_KEY = "mais1km-eunapolis:v4";
// Chaves antigas (versões com outras cidades): lidas uma vez para não perder conta e carimbos.
const LEGACY_STORAGE_KEYS = ["caderneta-porto-seguro:v3", "caderneta-porto-seguro:v1"];
const CITY_ID = "eunapolis";
const DEMO_DISCOVERED = ["EU-001", "EU-002", "EU-003", "EU-004", "EU-006", "EU-007", "EU-009", "EU-011", "EU-013"];

function makeInitialState() {
  const now = Date.now();
  return {
    version: 4,
    user: { number: "0042", name: "Viajante" },
    cityId: CITY_ID,
    theme: "light",
    // Conta nova começa sem carimbos fictícios: só o servidor confirma conquistas reais.
    conquered: [],
    discovered: [...DEMO_DISCOVERED],
    history: [],
    account: null,
    session: false,
    journey: createJourneyState(),
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
  // Jornada de Eunápolis: de estados antigos com jornadas por cidade, só a de Eunápolis é aproveitada.
  const legacyJourney = value.cityId === CITY_ID ? value.journey : value.journeys?.[CITY_ID];
  return {
    version: 4,
    user: { number: String(value.user?.number || "0042"), name: String(value.user?.name || "Viajante").slice(0, 36) },
    cityId: CITY_ID,
    theme: value.theme === "dark" ? "dark" : "light",
    conquered,
    discovered,
    history,
    account: normalizeAccount(value.account),
    session: !!normalizeAccount(value.account) && value.session === true,
    journey: normalizeJourneyState(legacyJourney),
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

export function claimPoint(state, pointId) {
  if (state.conquered.includes(pointId)) return { state, alreadyClaimed: true };
  const next = save({
    ...state,
    conquered: [...state.conquered, pointId],
    discovered: [...new Set([...state.discovered, pointId])],
    history: [...state.history, { pointId, at: new Date().toISOString(), kind: "point" }].slice(-100),
  });
  return { state: next, alreadyClaimed: false };
}

export function recordJourneyPoint(state, pointId, now = Date.now(), pointCityId = CITY_ID) {
  const currentJourney = refreshJourneyCycle(state.journey, now);
  const currentState = currentJourney === state.journey ? state : save({ ...state, journey: currentJourney });
  const result = recordJourneyPointState(currentState.journey, pointId, pointCityId, now);
  if (result.journey === currentState.journey) return { ...result, state: currentState };
  return { ...result, state: save({ ...currentState, journey: result.journey }) };
}

export function recordJourneyMilestone(state, milestoneId, now = Date.now()) {
  const currentJourney = refreshJourneyCycle(state.journey, now);
  const currentState = currentJourney === state.journey ? state : save({ ...state, journey: currentJourney });
  const result = recordJourneyMilestoneState(currentState.journey, milestoneId, now);
  if (result.journey === currentState.journey) return { ...result, state: currentState };
  return { ...result, state: save({ ...currentState, journey: result.journey }) };
}

export function startJourney(state, now = Date.now()) {
  const priorJourney = state.journey || createJourneyState();
  const currentJourney = refreshJourneyCycle(priorJourney, now);
  const currentState = currentJourney === state.journey ? state : save({ ...state, journey: currentJourney });
  const journey = startJourneyCycle(currentJourney, now);
  if (journey === currentState.journey) return currentState;
  return save({ ...currentState, journey });
}

export function refreshJourney(state, now = Date.now()) {
  const journey = refreshJourneyCycle(state.journey || createJourneyState(), now);
  if (journey === state.journey) return state;
  return save({ ...state, journey });
}

export { journeyClock };

export function revealPoint(state, pointId) {
  if (state.discovered.includes(pointId)) return state;
  return save({ ...state, discovered: [...state.discovered, pointId] });
}

export function setTheme(state, theme) {
  return save({ ...state, theme: theme === "dark" ? "dark" : "light" });
}

export function resetDemo(current = null) {
  try {
    localStorage.removeItem(STORAGE_KEY);
    for (const key of LEGACY_STORAGE_KEYS) localStorage.removeItem(key);
  } catch {}
  // Reiniciar a demonstração mantém a conta (quem reinicia continua logado); excluir conta passa current = null
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

// Carimbos feitos em tags físicas (guardados no servidor) entram na caderneta do aparelho.
// Cada item: { codigo: "eu-001", at: "2026-10-08T12:00:00.000Z" }. Não duplica e não conta jornada de carimbo anterior ao início do ciclo.
export function importServerStamps(state, items) {
  let next = state;
  let imported = 0;
  for (const { codigo, at } of items) {
    const point = findPointByCode(codigo);
    const ms = Date.parse(at);
    if (!point || !Number.isFinite(ms) || next.conquered.includes(point.id)) continue;
    const id = point.id;
    next = {
      ...next,
      conquered: [...next.conquered, id],
      discovered: [...new Set([...next.discovered, id])],
      history: [...next.history, { pointId: id, at: new Date(ms).toISOString(), kind: "point" }]
        .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
        .slice(-100),
    };
    imported += 1;
    if (next.journey.startedAt && ms >= Date.parse(next.journey.startedAt)) {
      next = recordJourneyPoint(next, id, ms).state;
    }
  }
  return imported ? { state: save(next), imported } : { state, imported: 0 };
}
