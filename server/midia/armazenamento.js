// Armazenamento dos arquivos de mídia (fotos dos pontos). Três destinos com a mesma interface:
//  - 'r2': Cloudflare R2 pela API S3, bucket privado. É o de produção; o servidor lê e entrega só o que foi aprovado.
//  - 'local': pasta no disco, para desenvolvimento e testes. Em produção só vale com MEDIA_DIR explícito (volume persistente),
//    porque o disco do contêiner some a cada redeploy e as fotos iriam junto.
//  - 'desligado' / 'r2-incompleto': configuração ausente ou pela metade. Nunca cai no disco em silêncio: gravar recusa.
// Interface: gravar(chave, buffer, contentType), ler(chave) → { stream, tamanho, contentType } | null, remover(chave), verificar() → { ok, tipo, erro? }.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { AwsClient } from 'aws4fetch';

const CHAVE_VALIDA = /^[a-z0-9_][a-z0-9_./-]{0,200}$/;
export function validarChave(chave) {
  if (typeof chave !== 'string' || !CHAVE_VALIDA.test(chave) || chave.includes('..') || chave.includes('//') || chave.endsWith('/')) throw new Error('chave_invalida');
  return chave;
}
const TIPOS = { webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', txt: 'text/plain' };
const tipoPorChave = (chave) => TIPOS[chave.split('.').pop()] || 'application/octet-stream';
const TEMPO_MS = 20000;

// Teste de ida e volta (gravar, ler, apagar). Nunca devolve segredo: só o código do erro.
async function verificarDestino(destino) {
  const chave = `_verificacao/${crypto.randomBytes(6).toString('hex')}.txt`;
  const conteudo = Buffer.from(`mais1km ${new Date().toISOString()}`);
  try {
    await destino.gravar(chave, conteudo, 'text/plain');
    try {
      const lido = await destino.ler(chave);
      if (!lido) throw new Error('verificacao_arquivo_nao_voltou');
      const partes = [];
      for await (const parte of lido.stream) partes.push(Buffer.from(parte));
      if (!Buffer.concat(partes).equals(conteudo)) throw new Error('verificacao_conteudo_diferente');
    } finally {
      await destino.remover(chave).catch(() => {});
    }
    return { ok: true, tipo: destino.tipo, descricao: destino.descricao };
  } catch (erro) {
    return { ok: false, tipo: destino.tipo, descricao: destino.descricao, erro: String(erro.message || 'erro').slice(0, 120) };
  }
}

export function criarLocal(dir) {
  const base = path.resolve(dir);
  const arquivo = (chave) => {
    const alvo = path.resolve(base, validarChave(chave));
    if (!alvo.startsWith(base + path.sep)) throw new Error('chave_invalida');
    return alvo;
  };
  const destino = {
    tipo: 'local',
    descricao: base,
    async gravar(chave, buffer) {
      const alvo = arquivo(chave);
      await fs.promises.mkdir(path.dirname(alvo), { recursive: true });
      const temporario = `${alvo}.${crypto.randomBytes(4).toString('hex')}.tmp`;
      await fs.promises.writeFile(temporario, buffer);
      await fs.promises.rename(temporario, alvo);
    },
    async ler(chave) {
      const alvo = arquivo(chave);
      let info;
      try { info = await fs.promises.stat(alvo); } catch (erro) { if (erro.code === 'ENOENT') return null; throw erro; }
      return { stream: fs.createReadStream(alvo), tamanho: info.size, contentType: tipoPorChave(chave) };
    },
    async remover(chave) {
      try { await fs.promises.unlink(arquivo(chave)); } catch (erro) { if (erro.code !== 'ENOENT') throw erro; }
    },
  };
  destino.verificar = () => verificarDestino(destino);
  return destino;
}

export function criarR2({ endpoint, bucket, accessKeyId, secretAccessKey }) {
  const raiz = String(endpoint).replace(/\/+$/, '');
  const aws = new AwsClient({ accessKeyId, secretAccessKey, service: 's3', region: 'auto' });
  const url = (chave) => `${raiz}/${bucket}/${validarChave(chave).split('/').map(encodeURIComponent).join('/')}`;
  const pedir = (chave, init) => aws.fetch(url(chave), { ...init, signal: AbortSignal.timeout(TEMPO_MS) });
  // O corpo da resposta de erro nunca entra na mensagem (pode ecoar cabeçalhos de assinatura): só ação e status.
  const falhar = (acao, r) => Object.assign(new Error(`r2_${acao}_${r.status}`), { status: r.status });
  const destino = {
    tipo: 'r2',
    descricao: `${new URL(raiz).host}/${bucket}`,
    async gravar(chave, buffer, contentType) {
      const r = await pedir(chave, { method: 'PUT', body: buffer, headers: { 'Content-Type': contentType || tipoPorChave(chave) } });
      if (!r.ok) throw falhar('gravar', r);
    },
    async ler(chave) {
      const r = await pedir(chave, { method: 'GET' });
      if (r.status === 404) return null;
      if (!r.ok) throw falhar('ler', r);
      const tamanho = Number(r.headers.get('content-length'));
      return { stream: Readable.fromWeb(r.body), tamanho: Number.isFinite(tamanho) && tamanho > 0 ? tamanho : null, contentType: r.headers.get('content-type') || tipoPorChave(chave) };
    },
    async remover(chave) {
      const r = await pedir(chave, { method: 'DELETE' });
      if (!r.ok && r.status !== 404) throw falhar('remover', r);
    },
  };
  destino.verificar = () => verificarDestino(destino);
  return destino;
}

// Destino sem configuração utilizável: recusa gravar (503 no servidor) e explica o que falta.
function criarInativo(tipo, descricao) {
  const recusar = () => { throw new Error('midia_sem_armazenamento'); };
  return {
    tipo, descricao,
    gravar: async () => recusar(),
    ler: async () => null,
    remover: async () => recusar(),
    verificar: async () => ({ ok: false, tipo, descricao, erro: 'midia_sem_armazenamento' }),
  };
}

const enderecoValido = (texto) => {
  try { const u = new URL(texto); return u.protocol === 'https:' || (u.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(u.hostname)); } catch { return false; }
};

// Escolhe o destino pelo ambiente. R2 completo vence; R2 pela metade nunca cai no disco; sem nada: disco só fora de produção.
export function criarArmazenamento(env = process.env) {
  const endpoint = env.R2_ENDPOINT || (env.R2_ACCOUNT_ID ? `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '');
  const faltando = [];
  if (!env.R2_BUCKET) faltando.push('R2_BUCKET');
  if (!env.R2_ACCESS_KEY_ID) faltando.push('R2_ACCESS_KEY_ID');
  if (!env.R2_SECRET_ACCESS_KEY) faltando.push('R2_SECRET_ACCESS_KEY');
  if (!endpoint) faltando.push('R2_ACCOUNT_ID ou R2_ENDPOINT');
  const algumR2 = Boolean(env.R2_BUCKET || env.R2_ACCESS_KEY_ID || env.R2_SECRET_ACCESS_KEY || env.R2_ENDPOINT || env.R2_ACCOUNT_ID);
  if (algumR2) {
    if (faltando.length) return criarInativo('r2-incompleto', `faltam ${faltando.join(', ')}`);
    if (!enderecoValido(endpoint)) return criarInativo('r2-incompleto', 'R2_ENDPOINT precisa ser uma URL https');
    return criarR2({ endpoint, bucket: env.R2_BUCKET, accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY });
  }
  if (env.MEDIA_DIR) return criarLocal(env.MEDIA_DIR);
  if (env.NODE_ENV === 'production') return criarInativo('desligado', 'defina as variáveis R2_* (ou MEDIA_DIR com volume persistente)');
  return criarLocal(path.join(os.tmpdir(), 'mais1km-midia'));
}
