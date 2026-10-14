import { JOURNEY_DAYS, JOURNEY_STAGES } from "./data.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const CYCLE_MS = JOURNEY_DAYS * DAY_MS;
const EMPTY_PROGRESS = () => Object.fromEntries(JOURNEY_STAGES.map((stage) => [stage.id, []]));

export function createJourneyState() {
  return {
    cycleNumber: 1,
    status: "not-started",
    startedAt: null,
    closedAt: null,
    currentStageIndex: 0,
    progress: EMPTY_PROGRESS(),
    history: [],
  };
}

export function normalizeJourneyState(value) {
  const initial = createJourneyState();
  if (!value || typeof value !== "object") return initial;
  const allowedStatuses = new Set(["not-started", "active", "completed", "expired"]);
  const status = allowedStatuses.has(value.status) ? value.status : "not-started";
  const progress = EMPTY_PROGRESS();
  for (const stage of JOURNEY_STAGES) {
    const entries = value.progress?.[stage.id];
    progress[stage.id] = Array.isArray(entries)
      ? [...new Set(entries.filter((id) => typeof id === "string").slice(0, 100))]
      : [];
  }
  const history = Array.isArray(value.history)
    ? value.history.filter((entry) => entry && Number.isInteger(entry.cycleNumber) && typeof entry.status === "string").slice(-12)
    : [];
  const startedAt = typeof value.startedAt === "string" && Number.isFinite(Date.parse(value.startedAt)) ? value.startedAt : null;
  const stageIndex = Math.max(0, Math.min(JOURNEY_STAGES.length, Number.isInteger(value.currentStageIndex) ? value.currentStageIndex : 0));
  // Ciclo ativo cuja etapa já não existe mais (catálogo de etapas encurtado): conta como concluído.
  const finalStatus = status === "active" && !startedAt ? "not-started" : status === "active" && stageIndex >= JOURNEY_STAGES.length ? "completed" : status;
  return {
    cycleNumber: Number.isInteger(value.cycleNumber) && value.cycleNumber > 0 ? value.cycleNumber : 1,
    status: finalStatus,
    startedAt,
    closedAt: typeof value.closedAt === "string" ? value.closedAt : null,
    currentStageIndex: stageIndex,
    progress,
    history,
  };
}

function summarizeCycle(journey, status, now) {
  const completedStages = status === "completed" ? JOURNEY_STAGES.length : Math.min(journey.currentStageIndex, JOURNEY_STAGES.length);
  const earnedMilestones = Object.values(journey.progress).reduce((sum, items) => sum + items.length, 0);
  return {
    ...journey,
    status,
    closedAt: new Date(now).toISOString(),
    currentStageIndex: status === "completed" ? JOURNEY_STAGES.length : journey.currentStageIndex,
    history: [...journey.history, {
      cycleNumber: journey.cycleNumber,
      status,
      startedAt: journey.startedAt,
      closedAt: new Date(now).toISOString(),
      completedStages,
      earnedMilestones,
    }].slice(-12),
  };
}

export function startJourneyCycle(journey, now = Date.now()) {
  if (journey.status === "active") return journey;
  const firstCycle = journey.status === "not-started" && !journey.startedAt;
  return {
    ...journey,
    cycleNumber: firstCycle ? journey.cycleNumber : journey.cycleNumber + 1,
    status: "active",
    startedAt: new Date(now).toISOString(),
    closedAt: null,
    currentStageIndex: 0,
    progress: EMPTY_PROGRESS(),
  };
}

export function refreshJourneyCycle(journey, now = Date.now()) {
  if (journey.status !== "active" || !journey.startedAt) return journey;
  const startedMs = Date.parse(journey.startedAt);
  if (!Number.isFinite(startedMs) || now < startedMs + CYCLE_MS) return journey;
  return summarizeCycle(journey, "expired", now);
}

function addStageAchievement(journey, achievementId, now) {
  if (journey.status !== "active") return { journey, alreadyRecorded: false, stageCompleted: false, journeyCompleted: false };
  const stage = JOURNEY_STAGES[journey.currentStageIndex];
  if (!stage) return { journey, alreadyRecorded: false, stageCompleted: false, journeyCompleted: false };
  const previous = journey.progress[stage.id] || [];
  if (previous.includes(achievementId)) return { journey, alreadyRecorded: true, stageCompleted: false, journeyCompleted: false };

  const nextProgress = [...previous, achievementId];
  const nextJourney = { ...journey, progress: { ...journey.progress, [stage.id]: nextProgress } };
  const target = stage.target;
  if (nextProgress.length < target) return { journey: nextJourney, alreadyRecorded: false, stageCompleted: false, journeyCompleted: false };

  const nextIndex = journey.currentStageIndex + 1;
  if (nextIndex >= JOURNEY_STAGES.length) {
    return { journey: summarizeCycle({ ...nextJourney, currentStageIndex: nextIndex }, "completed", now), alreadyRecorded: false, stageCompleted: true, journeyCompleted: true };
  }
  return { journey: { ...nextJourney, currentStageIndex: nextIndex }, alreadyRecorded: false, stageCompleted: true, journeyCompleted: false };
}

export function recordJourneyPoint(journey, pointId, pointCityId, now = Date.now()) {
  const stage = JOURNEY_STAGES[journey.currentStageIndex];
  if (stage?.kind !== "new-points" || stage.cityId !== pointCityId) {
    return { journey, alreadyRecorded: false, stageCompleted: false, journeyCompleted: false };
  }
  return addStageAchievement(journey, `point:${pointId}`, now);
}

export function journeyClock(journey, now = Date.now()) {
  if (!journey.startedAt) return { endsAt: null, remainingMs: 0, daysRemaining: 0, hoursRemaining: 0, elapsedPercent: 0 };
  const startedMs = Date.parse(journey.startedAt);
  if (!Number.isFinite(startedMs)) return { endsAt: null, remainingMs: 0, daysRemaining: 0, hoursRemaining: 0, elapsedPercent: 0 };
  const endsMs = startedMs + CYCLE_MS;
  const remainingMs = Math.max(0, endsMs - now);
  const elapsedPercent = Math.min(100, Math.max(0, Math.round(((now - startedMs) / CYCLE_MS) * 100)));
  return {
    endsAt: new Date(endsMs).toISOString(),
    remainingMs,
    daysRemaining: Math.floor(remainingMs / DAY_MS),
    hoursRemaining: Math.floor((remainingMs % DAY_MS) / (60 * 60 * 1000)),
    elapsedPercent,
  };
}
