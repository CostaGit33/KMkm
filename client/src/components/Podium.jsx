import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { LevelCard, MedalCard } from "./GamificationCards.jsx";
import "./podium.css";

export function Podium({ period, leaders = [], participants = 0, me }) {
  return (
    <section className="gc-podium" aria-labelledby="gc-podium-title">
      <div className="gc-podium__heading">
        <div>
          <p className="gc-eyebrow">Temporada mensal</p>
          <h2 id="gc-podium-title">Pódio · {period?.label || "mês atual"}</h2>
          <p className="gc-muted">Um carimbo confirmado pelo servidor por ponto diferente neste mês. Empates compartilham a posição.</p>
        </div>
        <span className="gc-podium__count">{participants} {participants === 1 ? "explorador" : "exploradores"}</span>
      </div>

      {leaders.length ? (
        <ol className="gc-podium__list" aria-label="Classificação da temporada">
          {leaders.map((player, index) => (
            <li className={`gc-podium__place rank-${player.rank}`} key={`${player.rank}-${player.alias}-${index}`}>
              <span className="gc-podium__rank">{player.rank}º</span>
              <strong className="gc-podium__alias">{player.alias}</strong>
              <span className="gc-podium__score">{player.seasonXP} XP</span>
              <span className="gc-podium__points">{player.uniquePoints} {player.uniquePoints === 1 ? "ponto" : "pontos"}</span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="gc-podium__empty">
          <span className="gc-podium__empty-mark" aria-hidden="true">✦</span>
          <strong>A temporada está começando</strong>
          <p>Seja uma das primeiras pessoas a carimbar um novo ponto neste mês.</p>
        </div>
      )}

      {me && (
        <p className="gc-podium__mine" aria-live="polite">
          {me.rank ? <>Sua posição: <strong>{me.rank}º</strong> · </> : "Sua posição no pódio público: — · "}
          Você tem <strong>{me.seasonXP} XP</strong> nesta temporada ({me.uniquePoints} pontos distintos).
        </p>
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
        <span><strong>Quero participar do pódio público</strong><small>Apenas seu apelido e pontuação mensal aparecem para outras pessoas.</small></span>
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");

  async function load() {
    setError("");
    const [nextProfile, nextSeason] = await Promise.all([
      api("/gamificacao/me"),
      api("/gamificacao/podio"),
    ]);
    setProfile(nextProfile);
    setSeason(nextSeason);
  }

  useEffect(() => {
    let active = true;
    Promise.all([api("/gamificacao/me"), api("/gamificacao/podio")])
      .then(([nextProfile, nextSeason]) => {
        if (!active) return;
        setProfile(nextProfile);
        setSeason(nextSeason);
      })
      .catch((cause) => { if (active) setError(cause.code === "sessao_conta_necessaria" ? "Entre na sua conta para ver seu progresso." : "Não foi possível carregar o pódio agora."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

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
        <p className="gc-eyebrow">Sua jornada</p>
        <h1>XP, medalhas e pódio</h1>
        <p>Os carimbos registrados e os caminhos concluídos constroem seu nível permanente.</p>
      </header>

      <LevelCard
        xp={profile.xp?.total || 0}
        medalsUnlocked={medals.filter((medal) => medal.earned).length}
        medalsTotal={medals.length}
      />

      <Podium period={season.period} leaders={season.leaders} participants={season.participants} me={season.me} />

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
        <p>Você pode entrar ou sair quando quiser. O ranking público usa somente o apelido escolhido e a pontuação desta temporada.</p>
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
