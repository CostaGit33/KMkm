# +1 KM · Caderneta de Rotas

PWA mobile-first de carimbos em tags NFC/QR fixadas em pontos reais de Eunápolis (BA). Cada ponto carimbado desbloqueia uma carta de personagem; rotas, eventos e patrocínios organizam a experiência. Projeto em fase de **piloto controlado** (veja `docs/riscos-piloto-eunapolis.md`).

## Estrutura

- `server/`: API Express + MySQL (migrações automáticas), administração, relatórios e scripts de operação.
- `client/`: frontend Vite (JavaScript, sem framework de UI), servido pelo próprio servidor como PWA.
- `docs/`: documentação ([índice](docs/INDEX.md)); `CHANGELOG.md`: histórico de versões.

## Executar localmente

```bash
cp server/.env.example server/.env
npm run setup
docker compose up -d db
npm run db:init
npm run dev:server        # em outro terminal: npm run dev:client
```

Os pontos nascem `pendente`. Publicar exige responsável, autorização e vistoria registrados (em `/admin` → editar ponto), ou confirmação explícita que fica na auditoria.

## Produção

`npm run setup && npm run build && npm start`. O servidor serve `client/dist` e escuta `PORT` (3000). Variáveis e passos: [`docs/DEPLOY-CHECKLIST.md`](docs/DEPLOY-CHECKLIST.md). Segurança e o que cada camada garante: [`docs/seguranca.md`](docs/seguranca.md).

## Comandos de operação

```bash
npm --prefix server run admin -- promover voce@exemplo.com      # libera /admin
npm --prefix server run pontos -- listar | publicar eu-001 | despublicar eu-001 [--forcar]
npm --prefix server run chaves -- ativar-todos | urls | girar eu-001
npm --prefix server run relatorio-piloto -- --dias 14           # funil e gatilhos de parada
npm --prefix server run evento -- listar                        # eventos e patrocínios
npm --prefix server test                                        # testes
```

## Como funciona (resumo técnico)

- **Conta**: e-mail e senha no servidor (scrypt), sessão por cookie HttpOnly (`SameSite=Lax`, 30 dias). O apelido anônimo existe só na página pública da tag (`/t/:codigo`), para quem ainda não tem conta.
- **Carimbo**: gravado no servidor, em transação, com janela de repetição de 30 min. O link da tag leva uma chave (`?k=`) e, se o ponto exigir, a localização é conferida. Marcações suspeitas ficam registradas para revisão.
- **Cartas, XP e pódio**: o primeiro carimbo de rota desbloqueia a carta; XP e ranking em `docs/gamificacao.md`.
- **Eventos e patrocínios**: cards com janela de datas e edição numerada (`docs/eventos-patrocinio.md`).
- **Mapa**: Google Maps (`GOOGLE_MAPS_API_KEY`) com alternativa OpenStreetMap; localização do visitante fica só no aparelho.
- **Páginas públicas**: `/privacidade`, `/termos-de-uso`, `/cookies`, `/excluir-conta`, `/como-funciona`, `/parceiros`.
- **Monitoramento**: Sentry (erros) e `/api/saude` (Better Stack); GA4 só com consentimento.

## Estado atual e limites conhecidos

Lista viva em [`TODO.md`](TODO.md). Os principais: carimbo por NFC comum não prova presença (só uma tag com contador assinado, como a NTAG 424 DNA, prova), testes de ponta a ponta ainda inexistentes, limite de tentativas em memória (uma instância) e cópia local do hash da senha no aparelho.
