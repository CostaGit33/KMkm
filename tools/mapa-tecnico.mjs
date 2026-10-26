#!/usr/bin/env node
/**
 * Gera docs/MAPA-TECNICO.md a partir da estrutura real do repositório.
 * Sem dependências externas. Executar na raiz: node tools/mapa-tecnico.mjs
 */
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = path.join(ROOT, "docs", "MAPA-TECNICO.md");
const EXCLUDED = new Set([".git", "node_modules", "dist", "coverage", ".vite", ".next"]);
const MAX_DEPTH = 4;

async function walk(dir, depth = 0) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  entries.sort((a, b) => {
    if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
    return a.name.localeCompare(b.name, "pt-BR");
  });
  const result = [];
  for (const entry of entries) {
    if (entry.name === ".git" || EXCLUDED.has(entry.name)) continue;
    const absolute = path.join(dir, entry.name);
    const relative = path.relative(ROOT, absolute).split(path.sep).join("/");
    if (entry.isDirectory()) {
      result.push({ path: relative, type: "dir", depth });
      if (depth < MAX_DEPTH) result.push(...await walk(absolute, depth + 1));
    } else {
      result.push({ path: relative, type: "file", depth });
    }
  }
  return result;
}

async function readJson(file) {
  try { return JSON.parse(await readFile(path.join(ROOT, file), "utf8")); }
  catch { return null; }
}

const entries = await walk(ROOT);
const manifests = entries.filter(e => e.type === "file" && path.posix.basename(e.path) === "package.json");
const manifestData = [];
for (const entry of manifests) {
  const pkg = await readJson(entry.path);
  if (pkg) manifestData.push({ path: entry.path, name: pkg.name ?? "(sem nome)", scripts: pkg.scripts ?? {}, dependencies: Object.keys(pkg.dependencies ?? {}).sort(), devDependencies: Object.keys(pkg.devDependencies ?? {}).sort() });
}

const lines = [
  "# Mapa técnico automático do projeto",
  "",
  "> Gerado por `node tools/mapa-tecnico.mjs`. Baseado nos arquivos presentes no repositório no momento da execução. Pastas ignoradas: `.git`, `node_modules`, `dist`, `coverage`, `.vite` e `.next`.",
  "",
  "## Arquitetura identificada",
  "",
  "```mermaid",
  "flowchart TD",
  '  U["Pessoa usuária"] --> PWA["client/ · PWA / frontend"]',
  '  PWA -->|HTTP / API| API["server/ · Express"]',
  '  API --> DB["MySQL · configuração e acesso definidos no servidor"]',
  '  API --> OPS["server/scripts/ · operações e manutenção"]',
  '  API --> OBS["Sentry / endpoint de saúde, quando configurados"]',
  '  DOCS["docs/ · documentação"] -. descreve .-> PWA',
  '  DOCS -. descreve .-> API',
  "```",
  "",
  "> O diagrama é uma visão lógica baseada na estrutura documentada; não descobre conexões de runtime, serviços externos ativos, variáveis definidas no ambiente ou recursos existentes na nuvem.",
  "",
  "## Estrutura do repositório",
  "",
  "```text",
  "KMkm/",
  ...entries.map(e => `${"  ".repeat(e.depth + 1)}${e.type === "dir" ? "📁 " : "📄 "}${path.posix.basename(e.path)}${e.type === "dir" ? "/" : ""}`),
  "```",
  "",
  "## Manifestos Node.js encontrados",
  "",
];

if (manifestData.length === 0) lines.push("Nenhum `package.json` foi encontrado.");
for (const pkg of manifestData) {
  lines.push(`### ${pkg.path}`, "", `- **Pacote:** ${pkg.name}`);
  lines.push("- **Scripts:**");
  if (Object.keys(pkg.scripts).length) {
    for (const [name, command] of Object.entries(pkg.scripts)) lines.push(`  - ` + "`" + `${name}` + "`" + `: ` + "`" + `${command}` + "`");
  } else lines.push("  - Nenhum script declarado.");
  lines.push("- **Dependências de produção:** " + (pkg.dependencies.length ? pkg.dependencies.map(x => "`" + x + "`").join(", ") : "nenhuma declarada"));
  lines.push("- **Dependências de desenvolvimento:** " + (pkg.devDependencies.length ? pkg.devDependencies.map(x => "`" + x + "`").join(", ") : "nenhuma declarada"), "");
}

lines.push(
  "## Arquivos relevantes detectados",
  "",
  ...["README.md", "TODO.md", "docs/INDEX.md", "docs/DEPLOY-CHECKLIST.md", "docs/seguranca.md", "server/index.js", "server/admin.js", "server/db/catalogo-inicial.json", "client/package.json", "docker-compose.yml", "Dockerfile", ".github/workflows"].map(file => {
    const exists = entries.some(e => e.path === file || e.path.startsWith(file + "/"));
    return `- ${exists ? "Encontrado" : "Não encontrado"}: \`${file}\``;
  }),
  "",
  "## Como atualizar",
  "",
  "Na raiz do repositório, execute:",
  "",
  "```bash",
  "node tools/mapa-tecnico.mjs",
  "```",
  "",
  "O comando atualiza este arquivo localmente. Revise e versione o resultado com Git. O script não instala pacotes, não acessa credenciais, não consulta produção e não altera arquivos da aplicação.",
  "",
  "## Limites",
  "",
  "- A árvore é limitada a quatro níveis para manter o documento legível.",
  "- Pastas ocultas e diretórios de dependências/build são omitidos.",
  "- O mapa não faz análise estática de imports nem confirma que integrações estejam funcionando.",
  "- A estrutura é reavaliada a cada execução; este documento só muda no repositório quando o resultado gerado for commitado."
);

await mkdir(path.dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, lines.join("\n") + "\n", "utf8");
console.log(`Mapa técnico gerado: ${path.relative(ROOT, OUTPUT)}`);
console.log(`Itens mapeados: ${entries.length}; manifestos Node.js: ${manifestData.length}`);
