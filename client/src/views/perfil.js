import { iniciais } from "../auth.js";
import { analyticsAvailable, getAnalyticsConsent } from "../telemetry.js";
import { escapeHtml, progressFor, certificateRoutes, formatDate, pageHead } from "./base.js";

function analyticsCard() {
  if (!analyticsAvailable) return "";
  const ligado = getAnalyticsConsent() === "granted";
  const texto = ligado
    ? "Ativadas: medimos com o Google Analytics quantas vezes o app abre e se há erros, sem nome nem e-mail."
    : "Desativadas. Nada é enviado ao Google Analytics.";
  return `<article class="card">
      <h2 class="card-title">Estatísticas de uso</h2>
      <p class="small muted">${texto} <a href="/privacidade">Saiba mais</a></p>
      <button class="outline-button button-full" type="button" data-action="analytics-consent" data-value="${ligado ? "denied" : "granted"}">${ligado ? "Desativar estatísticas" : "Ativar estatísticas"}</button>
      <button class="text-link privacy-preferences-link" type="button" data-action="privacy-preferences">Preferências de privacidade</button>
    </article>`;
}

export function renderProfile(state, mensagem = null) {
  const conta = state.account;
  const city = progressFor(state);
  const rotas = certificateRoutes(state).length;
  const desde = conta.criadoEm ? formatDate(conta.criadoEm, { day: "2-digit", month: "long", year: "numeric" }) : "";
  const aviso = mensagem?.texto ? `<p class="auth-error${mensagem.ok ? " ok" : ""}" role="status">${escapeHtml(mensagem.texto)}</p>` : "";
  return `${pageHead("Sua conta", "Meu perfil", "Seus dados de acesso e preferências.")}
    <article class="card profile-card">
      <div class="profile-avatar" aria-hidden="true">${escapeHtml(iniciais(conta.nome))}</div>
      <div>
        <h2 class="card-title">${escapeHtml(conta.nome)}</h2>
        <p class="small muted">${escapeHtml(conta.email)}</p>
        ${desde ? `<p class="small muted">Caderneta desde ${escapeHtml(desde)}</p>` : ""}
      </div>
    </article>
    <div class="stats-strip" aria-label="Resumo da conta">
      <div class="stat-card"><span class="stat-value">${city.count}<span style="font-size:.65em">/${city.total}</span></span><span class="stat-label">pontos da cidade</span></div>
      <div class="stat-card"><span class="stat-value">${rotas}</span><span class="stat-label">rotas concluídas</span></div>
      <div class="stat-card"><span class="stat-value">${state.history.length}</span><span class="stat-label">carimbos guardados</span></div>
    </div>
    ${aviso}
    <article class="card">
      <h2 class="card-title">Dados da conta</h2>
      <form class="form-stack" data-form="perfil-dados" novalidate>
        <label class="field"><span>Nome</span><input name="nome" type="text" maxlength="36" autocomplete="name" value="${escapeHtml(conta.nome)}" required /></label>
        <label class="field"><span>E-mail</span><input name="email" type="email" inputmode="email" autocapitalize="none" autocomplete="email" value="${escapeHtml(conta.email)}" required /></label>
        <label class="field"><span>Senha atual <small>(só para trocar o e-mail)</small></span><input name="senha_atual" type="password" autocomplete="current-password" /></label>
        <button class="primary-button button-full" type="submit">Salvar dados</button>
      </form>
    </article>
    <article class="card">
      <h2 class="card-title">Trocar senha</h2>
      <form class="form-stack" data-form="perfil-senha" novalidate>
        <label class="field"><span>Senha atual</span><input name="atual" type="password" autocomplete="current-password" required /></label>
        <label class="field"><span>Nova senha</span><input name="nova" type="password" autocomplete="new-password" minlength="8" required /></label>
        <label class="field"><span>Repita a nova senha</span><input name="confirma" type="password" autocomplete="new-password" required /></label>
        <button class="outline-button button-full" type="submit">Trocar senha</button>
      </form>
    </article>
    <article class="card">
      <h2 class="card-title">Sessão</h2>
      <p class="small muted">Sair encerra a sessão. Seus carimbos continuam salvos na sua conta.</p>
      <button class="outline-button button-full" type="button" data-action="logout">Sair da conta</button>
    </article>
    ${analyticsCard()}
    <article class="card danger-zone">
      <h2 class="card-title">Excluir conta</h2>
      <p class="small muted">Apaga a conta e todos os carimbos deste aparelho. Não tem como desfazer.</p>
      <button class="danger-button button-full" type="button" data-action="delete-account">Excluir conta e dados</button>
    </article>
    <p class="small muted legal-links"><a href="/privacidade">Política de Privacidade</a> · <a href="/excluir-conta">Como excluir a conta</a></p>`;
}
