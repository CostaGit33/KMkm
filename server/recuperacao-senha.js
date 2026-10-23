import express from 'express';
import crypto from 'node:crypto';
import { pool, q } from './db/database.js';
import { clearSessionCookie, hashPassword, makeSalt, normalizeEmail, validEmail } from './security.js';

export const recuperacaoSenhaRouter = express.Router();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_IP = 5;
const MAX_EMAIL_PER_HOUR = 3;
const buckets = new Map();

function rateLimit(req, res, next) {
  const now = Date.now();
  const ip = req.ip || 'unknown';
  const key = crypto.createHash('sha256').update(ip).digest('hex');
  let bucket = buckets.get(key);
  if (!bucket || bucket.until <= now) bucket = { count: 0, until: now + WINDOW_MS };
  bucket.count += 1;
  buckets.set(key, bucket);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.until <= now) buckets.delete(k);
  }
  if (bucket.count > MAX_IP) {
    res.setHeader('Retry-After', String(Math.ceil((bucket.until - now) / 1000)));
    return res.status(429).json({ erro: 'muitas_tentativas' });
  }
  req.recoveryIpHash = Buffer.from(key, 'hex');
  next();
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(String(token)).digest();
}
function genericResponse(res) {
  return res.status(200).json({ ok: true, mensagem: 'Se o e-mail estiver cadastrado, você receberá as instruções para redefinir a senha.' });
}
async function enviarEmail({ email, nome, token }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  const baseUrl = String(process.env.APP_PUBLIC_URL || '').replace(/\/$/, '');
  if (!apiKey || !from || !/^https:\/\//i.test(baseUrl)) {
    throw new Error('Recuperação de senha não configurada: defina RESEND_API_KEY, RESEND_FROM e APP_PUBLIC_URL HTTPS.');
  }
  const link = `${baseUrl}/?redefinir=${encodeURIComponent(token)}`;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Redefina sua senha do Mais1km',
      text: `Olá, ${nome}.\n\nRecebemos uma solicitação para redefinir a senha da sua conta Mais1km. Use este link em até 30 minutos:\n${link}\n\nSe você não solicitou a redefinição, ignore esta mensagem.\n\nA equipe Mais1km`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#24352c;max-width:560px;margin:auto"><h1>Mais1km</h1><p>Olá, ${String(nome).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}.</p><p>Recebemos uma solicitação para redefinir a senha da sua conta.</p><p><a href="${link}" style="display:inline-block;padding:12px 18px;background:#285943;color:#fff;text-decoration:none;border-radius:8px">Criar nova senha</a></p><p>Este link expira em 30 minutos e só pode ser usado uma vez.</p><p>Se você não solicitou isso, ignore este e-mail.</p></div>`
    }),
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Resend rejeitou o envio (HTTP ${response.status}): ${body.slice(0, 300)}`);
  }
}

recuperacaoSenhaRouter.post('/recuperar-senha', rateLimit, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!validEmail(email)) return genericResponse(res);
    const [conta] = await q('SELECT id, nome, email FROM contas WHERE email = ?', [email]);
    if (!conta) return genericResponse(res);

    const [recentes] = await q(
      'SELECT COUNT(*) AS total FROM recuperacao_senha_tokens WHERE conta_id = ? AND criado_em > UTC_TIMESTAMP() - INTERVAL 1 HOUR',
      [conta.id]
    );
    if (Number(recentes.total) >= MAX_EMAIL_PER_HOUR) return genericResponse(res);

    const token = crypto.randomBytes(32).toString('base64url');
    const expira = new Date(Date.now() + 30 * 60 * 1000);
    await q('UPDATE recuperacao_senha_tokens SET usado_em = COALESCE(usado_em, UTC_TIMESTAMP()) WHERE conta_id = ? AND usado_em IS NULL', [conta.id]);
    await q(
      'INSERT INTO recuperacao_senha_tokens (conta_id, token_hash, ip_hash, expira_em) VALUES (?, ?, ?, ?)',
      [conta.id, tokenHash(token), req.recoveryIpHash, expira]
    );
    try {
      await enviarEmail({ email: conta.email, nome: conta.nome, token });
    } catch (error) {
      await q('UPDATE recuperacao_senha_tokens SET usado_em = UTC_TIMESTAMP() WHERE token_hash = ?', [tokenHash(token)]);
      throw error;
    }
    return genericResponse(res);
  } catch (error) {
    next(error);
  }
});

recuperacaoSenhaRouter.post('/redefinir-senha', rateLimit, async (req, res, next) => {
  const token = String(req.body?.token || '');
  const senha = String(req.body?.senha || '');
  if (token.length < 30 || token.length > 200 || senha.length < 8 || senha.length > 128) {
    return res.status(400).json({ erro: 'token_ou_senha_invalidos' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      'SELECT id, conta_id FROM recuperacao_senha_tokens WHERE token_hash = ? AND usado_em IS NULL AND expira_em > UTC_TIMESTAMP() FOR UPDATE',
      [tokenHash(token)]
    );
    const registro = rows[0];
    if (!registro) {
      await connection.rollback();
      return res.status(400).json({ erro: 'token_invalido_ou_expirado' });
    }
    const salt = makeSalt();
    const hash = hashPassword(senha, salt);
    await connection.query('UPDATE contas SET senha_hash = ?, senha_salt = ? WHERE id = ?', [hash, salt, registro.conta_id]);
    await connection.query('DELETE FROM sessoes WHERE conta_id = ?', [registro.conta_id]);
    await connection.query('UPDATE recuperacao_senha_tokens SET usado_em = UTC_TIMESTAMP() WHERE conta_id = ? AND usado_em IS NULL', [registro.conta_id]);
    await connection.commit();
    clearSessionCookie(res);
    return res.json({ ok: true, mensagem: 'Senha redefinida. Entre com sua nova senha.' });
  } catch (error) {
    await connection.rollback().catch(() => {});
    next(error);
  } finally {
    connection.release();
  }
});
