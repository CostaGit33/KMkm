# +1 KM · Caderneta de Rotas

PWA mobile-first de **carimbos em tags NFC e QR Code** fixadas em pontos reais de Eunápolis (BA). A pessoa caminha ou pedala pela cidade, encosta o celular na tag (ou lê o QR) e **carimba** a caderneta. Cada ponto novo desbloqueia uma **carta de personagem**; rotas completas dão certificado, eventos e patrocínios abrem edições numeradas, e cada ponto pode mostrar fotos atuais e históricas do lugar.

> **Estado:** piloto controlado em Eunápolis. Riscos e gatilhos de parada: [`docs/riscos-piloto-eunapolis.md`](docs/riscos-piloto-eunapolis.md). Versão atual e histórico: [`CHANGELOG.md`](CHANGELOG.md). Pendências: [`TODO.md`](TODO.md).

## O que o produto faz

| Para quem | O que oferece |
|---|---|
| **Participante** | Conta com e-mail e senha; mapa com os pontos (Google Maps ou OpenStreetMap); rotas e circuitos; carimbo por NFC/QR; coleção de cartas; XP, nível e pódio mensal opcional; certificado ao completar uma rota; fotos dos pontos com comparador "Antes / Hoje"; exclusão de conta dentro do app. |
| **Administração** (`/admin`) | Criar, editar, publicar e arquivar pontos; montar circuitos e rotas de carimbo; cadastrar eventos e patrocínios; enviar e aprovar fotos; gerenciar pessoas; consultar o registro de auditoria. Guia: [`docs/admin.md`](docs/admin.md). |
| **Operação do piloto** | Relatório de funil e gatilhos de parada, chaves das tags, publicação por linha de comando, `/api/saude` para monitoramento. |

## Como o carimbo funciona

1. A tag guarda um link `/t/<código>?k=<chave>`. A chave (HMAC) impede adivinhar códigos como `eu-001` e carimbar de longe.
2. O servidor só aceita carimbo em ponto **publicado** e confere a **localização**: raio de **100 m** do ponto e precisão do GPS de até **50 m**. Ponto sem coordenadas válidas não carimba.
3. O carimbo é gravado em transação, com janela de repetição de 30 minutos. Marcações suspeitas (por exemplo, dois pontos distantes em poucos segundos) ficam registradas para revisão, sem bloquear.
4. O primeiro carimbo do ponto desbloqueia a carta e soma XP; completar um circuito soma mais. Regras em [`docs/gamificacao.md`](docs/gamificacao.md).
5. Em ponto com card de evento ou patrocínio aberto, o mesmo toque grava até dois carimbos ([`docs/eventos-patrocinio.md`](docs/eventos-patrocinio.md)).

A localização enviada é usada só para decidir o carimbo e **não é gravada**. O que cada camada garante, e o que não garante, está em [`docs/seguranca.md`](docs/seguranca.md): por exemplo, um carimbo por NFC comum não prova presença, e o GPS pode ser falsificado.

## Fotos dos pontos

Cada ponto pode ter fotos atuais e históricas. O original fica intacto num bucket privado (Cloudflare R2, ou um volume em `MEDIA_DIR`); o servidor gera cópias WebP **sem EXIF/GPS**, e só fotos **aprovadas** aparecem no app. Foto histórica ou restaurada exige autor ou fonte. Ponto-mistério não mostra foto. Detalhes, telas e regras: [`docs/midia.md`](docs/midia.md).

## Tecnologia

| Camada | O que usa |
|---|---|
| Servidor | Node.js (ES modules) + Express 4, MySQL via `mysql2`, migrações automáticas na subida, imagens com `sharp`, R2 via `aws4fetch` |
| Cliente | Vite, JavaScript e CSS; telas montadas por templates de texto, com React só nos componentes de pódio e gamificação; Leaflet para o mapa de reserva; Service Worker (PWA) |
| Compartilhado | `shared/`: regras de gamificação usadas pelo servidor e pelo cliente |
| Integrações opcionais | Google Maps, Resend (recuperação de senha), Sentry (erros), Better Stack (monitor de `/api/saude`), GA4 (só com consentimento) |
| Entrega | `Dockerfile` (Node 22) e CI no GitHub Actions: build do cliente e testes do servidor em PR e em `main` |

## Estrutura do repositório

```
server/    API Express, administração, mídia (server/midia), migrações (server/db), testes e scripts de operação (server/scripts)
client/    PWA (client/src), página /admin (client/src/admin) e arquivos públicos (client/public)
shared/    Regras compartilhadas entre servidor e cliente
docs/      Documentação (índice em docs/INDEX.md): arquitetura, fluxos, segurança, operação, API e piloto
```

Mapas técnicos completos: [arquitetura](docs/MAPA-ARQUITETURA.md) · [fluxos](docs/FLUXOS-SISTEMA.md) · [segurança e infraestrutura](docs/MAPA-SEGURANCA-INFRA.md). API: [`docs/api/`](docs/api/README.md) (OpenAPI e coleção Postman).

## Executar localmente

```bash
cp server/.env.example server/.env
npm run setup
docker compose up -d db
npm run db:init
npm run dev:server        # em outro terminal: npm run dev:client
```

Os pontos nascem `pendente`. Publicar exige responsável, autorização e vistoria registrados (em `/admin` → editar ponto), ou confirmação explícita que fica na auditoria, e coordenadas válidas.

## Produção

`npm run setup && npm run build && npm start`, ou a imagem do `Dockerfile`. O servidor serve `client/dist` e escuta `PORT` (3000). Variáveis, segurança e conferência pós-deploy: [`docs/DEPLOY-CHECKLIST.md`](docs/DEPLOY-CHECKLIST.md). As principais:

| Variável | Para quê |
|---|---|
| `DATABASE_URL` | MySQL (obrigatória) |
| `TAG_KEY_SECRET` | Segredo das chaves dos links das tags; guarde uma cópia fora do servidor |
| `GEOFENCE_RAIO_PADRAO_M` | Raio padrão do carimbo; padrão e máximo de 100 m, e `0` não desliga |
| `R2_*` ou `MEDIA_DIR` | Armazenamento das fotos |
| `RESEND_*`, `APP_PUBLIC_URL` | Recuperação de senha por e-mail |
| `GOOGLE_MAPS_API_KEY` | Mapa do Google; sem ela o app usa OpenStreetMap |
| `SENTRY_DSN`, `RELEASE_VERSION` | Erros e rótulo da versão em `/api/saude` |

`/api/saude` informa banco, versão, estado das chaves, geofence e tipo de armazenamento de mídia.

## Comandos de operação

```bash
npm --prefix server run admin -- promover voce@exemplo.com      # libera /admin
npm --prefix server run pontos -- listar | publicar eu-001 | despublicar eu-001 [--forcar]
npm --prefix server run chaves -- ativar-todos | urls | girar eu-001
npm --prefix server run midia -- verificar | listar | importar   # fotos dos pontos pelo console
npm --prefix server run relatorio-piloto -- --dias 14           # funil e gatilhos de parada
npm --prefix server run evento -- listar                        # eventos e patrocínios
npm --prefix server test                                        # testes
```

## Páginas públicas

`/privacidade`, `/termos-de-uso`, `/cookies`, `/excluir-conta`, `/como-funciona` e `/parceiros`. A publicação na Google Play está em [`docs/PLAY-STORE.md`](docs/PLAY-STORE.md).

## Limites conhecidos

Lista viva em [`TODO.md`](TODO.md). Os principais: o carimbo por NFC comum não prova presença (só uma tag com contador assinado, como a NTAG 424 DNA, prova); não há teste de ponta a ponta do fluxo conta → carimbo (existem e2e de mídia e de recuperação de senha, e um `smoke.mjs` manual); o limite de tentativas fica em memória (uma instância).
