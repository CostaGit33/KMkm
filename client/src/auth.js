// Dados mínimos ficam no estado local para continuidade da interface; a identidade e a senha válidas ficam no servidor.
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

export const validarNome = (nome) => {
  const n = String(nome || "").trim();
  if (n.length < 2) return "Digite seu nome, com pelo menos 2 letras.";
  if (n.length > 36) return "O nome pode ter até 36 caracteres.";
  return null;
};

export const validarEmail = (email) => {
  const e = String(email || "").trim();
  return e.length <= 120 && EMAIL.test(e) ? null : "Digite um e-mail válido, como voce@exemplo.com.";
};

export const validarSenha = (senha) => {
  const s = String(senha || "");
  if (s.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
  if (s.length > 100) return "A senha é longa demais.";
  return null;
};

export const iniciais = (nome) => {
  const p = String(nome || "").trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "?";
  return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
};

// SHA-256 quando o navegador oferece crypto.subtle (HTTPS, localhost ou app Cordova).
// Sem essa API usa FNV-1a, que NÃO é criptográfico; o registro guarda qual método foi usado.
async function digest(texto, alg) {
  const subtle = globalThis.crypto?.subtle;
  if (alg === "sha256" || (!alg && subtle)) {
    if (!subtle) return null;
    return { alg: "sha256", hash: hex(await subtle.digest("SHA-256", new TextEncoder().encode(texto))) };
  }
  let h = 2166136261;
  for (const ch of texto) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return { alg: "fnv1a", hash: h.toString(16) };
}

export async function gerarSenha(senha) {
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else bytes.forEach((_, i) => { bytes[i] = Math.floor(Math.random() * 256); });
  const salt = hex(bytes);
  return { salt, ...(await digest(salt + ":" + senha)) };
}

export async function senhaConfere(conta, senha) {
  if (!conta) return false;
  const r = await digest(conta.salt + ":" + senha, conta.alg);
  return !!r && r.hash === conta.hash;
}

const campo = (nome, rotulo, tipo, dica, autocomplete, extra = "") =>
  `<label class="field"><span>${rotulo}</span><input name="${nome}" type="${tipo}" placeholder="${esc(dica)}" autocomplete="${autocomplete}" ${extra} required /></label>`;

export function renderAuth({ temConta = false, mensagem = "", emailSugerido = "", rascunho = {} } = {}) {
  const criar = !temConta;
  return `<section class="auth-page" aria-labelledby="auth-titulo">
    <div class="auth-brand">
      <img class="brand-mark" src="/icons/stamp.svg" alt="" width="72" height="72" />
      <h1 class="auth-title" id="auth-titulo">+1 KM</h1>
      <p class="auth-sub">Carimbos de rota para descobrir Eunápolis</p>
    </div>
    <form class="card auth-card" data-form="${criar ? "criar" : "entrar"}" novalidate>
      <h2 class="auth-h">${criar ? "Criar conta" : "Entrar"}</h2>
    <p class="small muted">${criar ? "Sua conta e seus carimbos ficam vinculados ao servidor." : "Entre com o e-mail e a senha da sua conta."}</p>
      ${criar ? campo("nome", "Nome", "text", "Como você quer ser chamado", "name", `maxlength="36" value="${esc(rascunho.nome || "")}"`) : ""}
      ${campo("email", "E-mail", "email", "voce@exemplo.com", "email", `inputmode="email" autocapitalize="none" spellcheck="false" value="${esc(rascunho.email || emailSugerido)}"`)}
      ${campo("senha", "Senha", "password", "Mínimo de 8 caracteres", criar ? "new-password" : "current-password", 'minlength="8"')}
      ${criar ? campo("confirma", "Repita a senha", "password", "Digite a mesma senha", "new-password") : ""}
      ${mensagem ? `<p class="auth-error" role="alert">${esc(mensagem)}</p>` : ""}
      <button class="primary-button button-full" type="submit">${criar ? "Criar conta" : "Entrar"}</button>
    </form>
    <p class="small muted legal-links">Ao continuar você concorda com a <a href="/privacidade" target="_blank" rel="noopener">Política de Privacidade</a>.</p>
    ${criar ? "" : `<div class="auth-foot"><p class="small muted">Esqueceu a senha? Por enquanto não há recuperação. A única saída é excluir a conta deste aparelho, o que apaga os carimbos.</p><button class="text-link" type="button" data-action="delete-account">Excluir conta deste aparelho</button></div>`}
  </section>`;
}
