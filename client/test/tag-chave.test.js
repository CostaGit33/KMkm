import test from "node:test";
import assert from "node:assert/strict";

const valores = new Map();
const historico = [];
globalThis.window = {
  location: { pathname: "/", search: "", hash: "" },
  history: {
    replaceState(_state, _title, url) {
      historico.push(String(url));
      window.location.pathname = String(url).split("?")[0].split("#")[0];
    },
  },
  sessionStorage: {
    getItem(key) { return valores.has(key) ? valores.get(key) : null; },
    setItem(key, value) { valores.set(key, String(value)); },
    removeItem(key) { valores.delete(key); },
  },
};

const { capturarLinkTagExterno, lerChaveTag } = await import("../src/tag-chave.js");

test("aceita App Link HTTPS da TAG, guarda a chave e remove k da URL", () => {
  const code = capturarLinkTagExterno(
    "https://mais1km.novaagencian8n.online/t/EU-001?k=abcDEF_123-xyz&utm_source=nfc",
  );

  assert.equal(code, "eu-001");
  assert.equal(lerChaveTag("eu-001"), "abcDEF_123-xyz");
  assert.equal(historico.at(-1), "/t/EU-001?utm_source=nfc");
  assert.equal(historico.at(-1).includes("abcDEF_123-xyz"), false);
});

test("rejeita host externo, HTTP e caminho que não seja TAG", () => {
  const count = historico.length;

  assert.equal(capturarLinkTagExterno("https://evil.example/t/eu-001?k=12345678"), "");
  assert.equal(capturarLinkTagExterno("http://mais1km.novaagencian8n.online/t/eu-001?k=12345678"), "");
  assert.equal(capturarLinkTagExterno("https://mais1km.novaagencian8n.online/perfil?k=12345678"), "");
  assert.equal(historico.length, count);
});

test("não mantém chave fora do formato permitido", () => {
  assert.equal(capturarLinkTagExterno("https://mais1km.novaagencian8n.online/t/eu-002?k=curta"), "eu-002");
  assert.equal(lerChaveTag("eu-002"), "");
  assert.equal(historico.at(-1), "/t/eu-002");
});
