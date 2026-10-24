// Preload de teste local: intercepta fetch para api.resend.com e grava cada e-mail em RESEND_STUB_OUT (nada é enviado).
// Uso: node --import ./server/scripts/stub-resend.mjs server/index.js
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const out = process.env.RESEND_STUB_OUT || path.join(os.tmpdir(), 'resend-stub.jsonl');
const original = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).startsWith('https://api.resend.com')) {
    fs.appendFileSync(out, JSON.stringify({ url: String(url), auth: init?.headers?.Authorization, body: JSON.parse(init.body) }) + '\n');
    return new Response(JSON.stringify({ id: 'stub' }), { status: 200 });
  }
  return original(url, init);
};
