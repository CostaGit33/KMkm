import React from "react";
import { GAMIFICATION_LEVELS, getLevelForXP } from "../../../shared/gamification.mjs";
export { GAMIFICATION_LEVELS, getLevelForXP };
import "./gamification-cards.css";

const integerXP = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
};

const formatNumber = (value) => new Intl.NumberFormat("pt-BR").format(value);

/** Card de nível. Passe XP confirmado pela API; nunca calcule recompensa oficial no cliente. */
export function LevelCard({
  xp = 0,
  medalsUnlocked = 0,
  medalsTotal = 0,
  onOpenMedals,
  className = "",
}) {
  const { xp: totalXP, current, next, progressXP, rangeXP, percent } = getLevelForXP(xp);
  const medals = Math.max(0, integerXP(medalsUnlocked));
  const totalMedals = Math.max(medals, integerXP(medalsTotal));
  const remaining = next ? Math.max(0, next.minXP - totalXP) : 0;

  return (
    <section className={`gc-level-card ${className}`.trim()} aria-labelledby="gc-level-title">
      <div className="gc-level-card__heading">
        <span className="gc-level-card__emblem" aria-hidden="true">{current.icon}</span>
        <div className="gc-level-card__title-wrap">
          <p className="gc-eyebrow">Sua evolução</p>
          <h2 className="gc-level-card__title" id="gc-level-title">{current.name}</h2>
          <p className="gc-level-card__subtitle">Nível {current.level}</p>
        </div>
        <strong className="gc-level-card__xp-total">{formatNumber(totalXP)} <span>XP</span></strong>
      </div>

      {next ? (
        <>
          <div
            className="gc-progress-track"
            role="progressbar"
            aria-label={`Progresso para o nível ${next.level}, ${next.name}`}
            aria-valuemin={current.minXP}
            aria-valuemax={next.minXP}
            aria-valuenow={Math.min(totalXP, next.minXP)}
            aria-valuetext={`${formatNumber(progressXP)} de ${formatNumber(rangeXP)} XP neste nível`}
          >
            <span className="gc-progress-fill" style={{ width: `${percent}%` }} />
          </div>
          <p className="gc-level-card__next">
            Faltam <strong>{formatNumber(remaining)} XP</strong> para <strong>{next.name}</strong>
          </p>
        </>
      ) : (
        <p className="gc-level-card__next gc-level-card__next--complete">
          Nível máximo da escala atual. Novas explorações continuam contando no seu histórico.
        </p>
      )}

      {totalMedals > 0 && (
        <div className="gc-level-card__footer">
          <span>{medals} de {totalMedals} medalhas</span>
          {onOpenMedals && (
            <button className="gc-text-button" type="button" onClick={onOpenMedals}>
              Ver medalhas <span aria-hidden="true">→</span>
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function formatEarnedDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

/**
 * Medalha pode ser informada como:
 * { id, name, description, icon, earned, earnedAt, progress: { current, target } }
 */
export function MedalCard({ medal, onClick, className = "" }) {
  if (!medal) return null;

  const earned = medal.earned === true || Boolean(medal.earnedAt);
  const current = Math.max(0, integerXP(medal.progress?.current));
  const target = Math.max(0, integerXP(medal.progress?.target));
  const progress = target ? Math.min(current, target) : 0;
  const percent = target ? Math.round((progress / target) * 100) : 0;
  const date = earned ? formatEarnedDate(medal.earnedAt) : "";
  const CardElement = onClick ? "button" : "article";
  const accessibleState = earned
    ? `Conquistada${date ? ` em ${date}` : ""}`
    : target
      ? `Em progresso: ${progress} de ${target}`
      : "Ainda não conquistada";

  return (
    <CardElement
      className={`gc-medal-card ${earned ? "is-earned" : "is-locked"} ${onClick ? "is-actionable" : ""} ${className}`.trim()}
      aria-label={`${medal.name}. ${accessibleState}. ${medal.description || ""}`.trim()}
      onClick={onClick}
      type={onClick ? "button" : undefined}
    >
      <span className="gc-medal-card__icon" aria-hidden="true">{medal.icon || "✦"}</span>
      <span className="gc-medal-card__content">
        <span className="gc-medal-card__name">{medal.name}</span>
        {medal.description && <span className="gc-medal-card__description">{medal.description}</span>}

        {earned ? (
          <span className="gc-medal-card__status">
            <span className="gc-status-dot" aria-hidden="true">✓</span>
            {date ? `Conquistada · ${date}` : "Conquistada"}
          </span>
        ) : target > 0 ? (
          <span className="gc-medal-card__progress-wrap">
            <span className="gc-medal-card__progress-label">{progress} de {target}</span>
            <span
              className="gc-progress-track gc-progress-track--small"
              role="progressbar"
              aria-label={`Progresso para ${medal.name}`}
              aria-valuemin={0}
              aria-valuemax={target}
              aria-valuenow={progress}
            >
              <span className="gc-progress-fill" style={{ width: `${percent}%` }} />
            </span>
          </span>
        ) : (
          <span className="gc-medal-card__status">Ainda não conquistada</span>
        )}
      </span>
      {onClick && <span className="gc-medal-card__arrow" aria-hidden="true">›</span>}
    </CardElement>
  );
}
