import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { LevelCard, MedalCard } from "./GamificationCards.jsx";
import "./podium.css";

const DIA_MS = 24 * 60 * 60 * 1000;
const ABAS = [
  { id: "mes", label: "Este mês" },
  { id: "geral", label: "Geral" },
];

function diasRestantes(fim) {
  const ms = Date.parse(fim) - Date.now();
  return Number.isFinite(ms) ? Math.max(0, Math.ceil(ms / DIA_MS)) : null;
}

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

function Linha({ player, geral }) {
  return (
    <li className={`gc-board__row${player.isMe ? " is-me" : ""}`}>
      <span className="gc-board__rank">{player.rank}º</span>
      <span className="gc-board__who">
        <strong>{player.alias}{player.isMe ? <em> · você</em> : null}</strong>
        {geral && player.level ? <small>{player.level.icon} {player.level.name}</small> : <small>{plural(player.uniquePoints, "ponto", "pontos")}</small>}
      </span>
      <span className="gc-board__xp">{player.xp} XP</span>
    </li>
  );
}

function MinhaPosicao({ me, scope, listed }) {
  if (!me) return null;
  const periodo = scope === "mes" ? "neste mês" : "no total";
  let texto;
  if (me.optedIn && me.rank === 1) {
    texto = <>Você lidera o ranking com <strong>{me.xp} XP</strong>.</>;
  } else if (me.optedIn && me.rank) {
    const falta = me.toNext;
    texto = (
      <>
        Você está em <strong>{me.rank}º</strong> com <strong>{me.xp} XP</strong>.{" "}
        {falta && falta.xp > 0
          ? <>Faltam <strong>{falta.xp} XP</strong>{falta.points ? <> (cerca de {plural(falta.points, "ponto novo", "pontos novos")})</> : null} para o {falta.rank}º lugar.</>
          : falta ? <>Empate de XP com o {falta.rank}º: quem chegou primeiro fica na frente.</> : null}
      </>
    );
  } else if (me.optedIn) {
    texto = <>Você ainda não pontuou {periodo}. Carimbe um ponto para entrar na disputa.</>;
  } else if (me.wouldRank) {
    texto = <>Com <strong>{me.xp} XP</strong> {periodo} você ficaria em <strong>{me.wouldRank}º</strong>. Ative “Quero participar do pódio público”, mais abaixo, para aparecer no ranking.</>;
  } else {
    texto = <>Você não aparece no ranking público. Para participar, use “Privacidade do pódio”, mais abaixo.</>;
  }
  return (
    <p className="gc-podium__mine" aria-live="polite">
      {me.optedIn && me.rank && !listed ? <span className="gc-podium__mine-rank">{me.rank}º</span> : null}
      <span>{texto}</span>
    </p>
  );
}

export function Podium({ scope, onScope, season, loading }) {
  const [expandido, setExpandido] = useState(false);
  const geral = scope === "geral";
  const board = season?.board || [];
  const top = board.slice(0, 3);
  const resto = board.slice(3, expandido ? board.length : 10);
  const temMais = board.length > 10;
  const dias = !geral && season?.period?.end ? diasRestantes(season.period.end) : null;
  const participantes = season?.participants ?? 0;

  return (
    <section className="gc-podium" aria-labelledby="gc-podium-title" aria-busy={loading}>
      <div className="gc-podium__heading">
        <div>
          <p className="gc-eyebrow">{geral ? "Ranking permanente" : "Temporada mensal"}</p>
          <h2 id="gc-podium-title">{geral ? "Ranking geral" : `Pódio · ${season?.period?.label || "mês atual"}`}</h2>
          <p className="gc-muted">
            {geral
              ? "XP de todos os tempos: 10 por ponto diferente carimbado e 20 por circuito concluído."
              : "10 XP por ponto diferente carimbado neste mês. Em caso de empate, vence quem chegou primeiro."}
          </p>
        </div>
        <span className="gc-podium__count">{plural(participantes, "explorador", "exploradores")}</span>
      </div>

      <div className="gc-tabs" role="tablist" aria-label="Período do ranking">
        {ABAS.map((aba) => (
          <button key={aba.id} type="button" role="tab" id={`gc-tab-${aba.id}`} aria-selected={scope === aba.id}
            className={`gc-tab${scope === aba.id ? " is-active" : ""}`} onClick={() => { setExpandido(false); onScope(aba.id); }}>
            {aba.label}
          </button>
        ))}
      </div>
      {dias !== null && <p className="gc-podium__timer">{dias <= 1 ? "A temporada encerra hoje." : `A temporada encerra em ${dias} dias.`}</p>}

      {top.length ? (
        <ol className="gc-podium__list" aria-label={geral ? "Três primeiros do ranking geral" : "Três primeiros da temporada"}>
          {top.map((player) => (
            <li className={`gc-podium__place rank-${player.rank}${player.isMe ? " is-me" : ""}`} key={`${player.rank}-${player.alias}`}>
              <span className="gc-podium__rank">{player.rank}º</span>
              <strong className="gc-podium__alias">{player.alias}</strong>
              <span className="gc-podium__score">{player.xp} XP</span>
              <span className="gc-podium__points">{geral && player.level ? `${player.level.icon} ${player.level.name}` : plural(player.uniquePoints, "ponto", "pontos")}</span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="gc-podium__empty">
          <span className="gc-podium__empty-mark" aria-hidden="true">✦</span>
          <strong>{geral ? "O ranking está começando" : "A temporada está começando"}</strong>
          <p>Seja uma das primeiras pessoas a carimbar um ponto novo{geral ? "" : " neste mês"}.</p>
        </div>
      )}

      {resto.length > 0 && <ol className="gc-board" start={4} aria-label="Demais posições">{resto.map((player) => <Linha key={`${player.rank}-${player.alias}`} player={player} geral={geral} />)}</ol>}
      {temMais && (
        <button type="button" className="gc-link-button" onClick={() => setExpandido((value) => !value)} aria-expanded={expandido}>
          {expandido ? "Mostrar menos" : `Ver mais posições (${Math.min(board.length, 25) - 10})`}
        </button>
      )}

      <MinhaPosicao me={season?.me} scope={scope} listed={board.some((player) => player.isMe) && (expandido || (season?.me?.rank ?? 99) <= 10)} />

      {!geral && season?.previous && (
        <div className="gc-previous">
          <p className="gc-eyebrow">Vencedores de {season.previous.label}</p>
          <ol>
            {season.previous.leaders.map((player) => (
              <li key={`${player.rank}-${player.alias}`}><span>{player.rank}º</span><strong>{player.alias}</strong><small>{player.xp} XP</small></li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

function ParticipationForm({ initialOptIn, initialAlias, onSave, saving, error }) {
  const [optIn, setOptIn] = useState(initialOptIn);
  const [alias, setAlias] = useState(initialAlias);
  useEffect(() => { setOptIn(initialOptIn); setAlias(initialAlias); }, [initialOptIn, initialAlias]);

  function submit(event) {
    event.preventDefault();
    onSave({ optIn, alias });
  }

  return (
    <form className="gc-optin" onSubmit={submit}>
      <label className="gc-optin__check">
        <input type="checkbox" checked={optIn} onChange={(event) => setOptIn(event.target.checked)} />
        <span><strong>Quero participar do pódio público</strong><small>Apenas seu apelido e sua pontuação aparecem para outras pessoas.</small></span>
      </label>
      {optIn && (
        <label className="gc-optin__alias">
          <span>Apelido público</span>
          <input
            type="text"
            value={alias}
            onChange={(event) => setAlias(event.target.value)}
            minLength={2}
            maxLength={30}
            autoComplete="nickname"
            placeholder="Ex.: Viajante do Sul"
            required
          />
          <small>Não use seu e-mail ou nome completo.</small>
        </label>
      )}
      {error && <p className="gc-error" role="alert">{error}</p>}
      <button className="gc-primary-button" type="submit" disabled={saving || (optIn && alias.trim().length < 2)}>
        {saving ? "Salvando…" : optIn ? "Participar do pódio" : initialOptIn ? "Sair do pódio" : "Salvar preferência"}
      </button>
    </form>
  );
}

export function PodiumPage() {
  const [profile, setProfile] = useState(null);
  const [season, setSeason] = useState(null);
  const [scope, setScope] = useState("mes");
  const [loading, setLoading] = useState(true);
  const [seasonLoading, setSeasonLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");

  async function load() {
    setError("");
    const [nextProfile, nextSeason] = await Promise.all([
      api("/gamificacao/me"),
      api(`/gamificacao/podio?periodo=${scope}&limite=25`),
    ]);
    setProfile(nextProfile);
    setSeason(nextSeason);
  }

  useEffect(() => {
    let active = true;
    setSeasonLoading(true);
    const request = profile
      ? api(`/gamificacao/podio?periodo=${scope}&limite=25`).then((nextSeason) => [profile, nextSeason])
      : Promise.all([api("/gamificacao/me"), api(`/gamificacao/podio?periodo=${scope}&limite=25`)]);
    request
      .then(([nextProfile, nextSeason]) => {
        if (!active) return;
        setProfile(nextProfile);
        setSeason(nextSeason);
        setError("");
      })
      .catch((cause) => { if (active) setError(cause.code === "sessao_conta_necessaria" ? "Entre na sua conta para ver seu progresso." : "Não foi possível carregar o pódio agora."); })
      .finally(() => { if (active) { setLoading(false); setSeasonLoading(false); } });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  async function saveParticipation(value) {
    setSaving(true);
    setSaveError("");
    try {
      await api("/gamificacao/participacao", { method: "PUT", body: value });
      await load();
    } catch (cause) {
      setSaveError(cause.code === "apelido_publico_invalido" ? "Escolha um apelido de 2 a 30 caracteres, sem e-mail." : "Não foi possível salvar sua participação. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="gc-page"><p role="status">Carregando sua evolução…</p></div>;
  if (error) return <div className="gc-page"><p className="gc-error" role="alert">{error}</p></div>;
  if (!profile || !season) return <div className="gc-page"><p className="gc-error" role="alert">Não há dados de gamificação disponíveis.</p></div>;

  const medals = profile.medals || [];
  return (
    <div className="gc-page">
      <header className="gc-page__header">
        <p className="gc-eyebrow">Seu progresso</p>
        <h1>XP, medalhas e pódio</h1>
        <p>Os carimbos registrados e os caminhos concluídos constroem seu nível permanente.</p>
      </header>

      <LevelCard
        xp={profile.xp?.total || 0}
        medalsUnlocked={medals.filter((medal) => medal.earned).length}
        medalsTotal={medals.length}
      />

      <Podium scope={scope} onScope={setScope} season={season} loading={seasonLoading} />

      <section className="gc-medal-section" aria-labelledby="gc-medals-title">
        <div className="gc-section-heading">
          <div><p className="gc-eyebrow">Conquistas permanentes</p><h2 id="gc-medals-title">Suas medalhas</h2></div>
        </div>
        <div className="gc-medal-grid">
          {medals.map((medal) => <MedalCard key={medal.id} medal={medal} />)}
        </div>
      </section>

      <section className="gc-participation" aria-labelledby="gc-participation-title">
        <h2 id="gc-participation-title">Privacidade do pódio</h2>
        <p>Você pode entrar ou sair quando quiser. O ranking público usa somente o apelido escolhido e a pontuação (mensal e geral).</p>
        <ParticipationForm
          key={`${profile.participation?.optedIn}-${profile.participation?.alias}`}
          initialOptIn={Boolean(profile.participation?.optedIn)}
          initialAlias={profile.participation?.alias || ""}
          onSave={saveParticipation}
          saving={saving}
          error={saveError}
        />
      </section>
    </div>
  );
}
