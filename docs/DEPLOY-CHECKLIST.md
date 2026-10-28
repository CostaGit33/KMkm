# Checklist de publicação do +1 KM (Easypanel + Google Play)

## 1. Variáveis de ambiente (aba Ambiente do serviço, não argumentos de build)
| Variável | Para quê | Obrigatória |
|---|---|---|
| `DATABASE_URL` | MySQL (`mysql://usuario:senha@host:3306/banco`) | sim |
| `CONTATO_EMAIL` | e-mail exibido em /privacidade e /excluir-conta (exigido pela Google Play) | sim |
| `GOOGLE_MAPS_API_KEY` | chave `AIza...` do Maps JavaScript API | recomendada |
| `GOOGLE_MAP_ID` | Map ID para estilo próprio (verde e dourado) | opcional |
| `RELEASE_VERSION` | rótulo da versão publicada (commit curto ou `v8.13`), devolvido em `/api/saude` e útil para achar qual deploy gerou um erro | recomendada |
| `RESEND_API_KEY` | chave de envio do Resend (segredo: só variável de execução, nunca Build Args nem `VITE_*`). Liga a recuperação de senha | para recuperar senha |
| `RESEND_FROM` | remetente de um domínio verificado no Resend, ex.: `Mais1km <conta@seudominio.com.br>` | para recuperar senha |
| `APP_PUBLIC_URL` | URL pública HTTPS do app, sem barra final; base do link do e-mail e dos links das tags (CSV/QR) | para recuperar senha e exportar links |
| `SENTRY_DSN` | DSN do projeto Sentry (`mais1km-api`). Liga o rastreio de erros 5xx e de falhas que derrubam o processo; sem a variável nada é enviado. Ao ligar, `/privacidade` passa a citar o Sentry | opcional |
| `SENTRY_ENVIRONMENT` | rótulo do ambiente no Sentry (padrão `production`) | opcional |
| `SENTRY_TRACES_SAMPLE_RATE` | amostra de latência entre `0` e `1`; comece com `0.05` ou `0.1`, `0` desliga | opcional |
| `TAG_KEY_SECRET` | segredo (32+ caracteres aleatórios) das chaves dos links das tags. Segredo de execução; **guarde uma cópia fora do servidor**: sem ele os links já gravados nas tags deixam de funcionar | sim, antes de gravar as tags |
| `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | armazenamento das fotos dos pontos (bucket privado `mais1km-media`; token R2 só com leitura e gravação nesse bucket). Segredos de execução, só no Easypanel. Alternativa: `MEDIA_DIR` apontando para um volume persistente. Veja [midia.md](midia.md) | para usar a galeria de fotos |
| `GEOFENCE_RAIO_PADRAO_M` | raio padrão (m) para exigir localização no carimbo; `0` desliga. Só ligue com coordenadas conferidas em campo | opcional (padrão 0) |
| `EXIGIR_AUTORIZACAO` | `true` (padrão) exige responsável, autorização e vistoria para publicar um ponto | opcional |
| `CSP_LEGADO` | `true` reabre `unsafe-inline`/`unsafe-eval` em scripts; só como saída temporária se a CSP estrita quebrar algo | não |
| `FRAME_ANCESTORS` / `ORIGENS_PERMITIDAS` / `COOKIE_SAMESITE` | só se o app for embutido em outro site ou servido por mais de um domínio (padrões seguros: nenhum / só o próprio host / `Lax`) | não |
| `ADMIN_EMAIL` / `ADMIN_SENHA` | só para os testes de API; nunca em produção compartilhada | não |

Segredo de assinatura de URL do Google (termina em `=`) **não** é a chave do Maps e não deve ir para o navegador.

## 2. Segurança antes de publicar
- [ ] Trocar a senha do MySQL e tirar `DATABASE_URL` dos argumentos de build.
- [ ] Chave do Maps restrita por domínio (referenciadores HTTP) e só à Maps JavaScript API.
- [ ] Rodar `node server/scripts/teste-podio.js limpar` para apagar carimbos de teste.
- [ ] Conferir que `/api/admin/dados` sem login responde 401.
- [ ] Definir `TAG_KEY_SECRET`, rodar `npm --prefix server run chaves -- ativar-todos` e `... urls`; gravar nas tags/QR os links **com** `?k=`. Conferir em `/api/saude` que `chaves` é `configuradas`.
- [ ] Abrir o app no celular e conferir no console que não há violações de CSP (mapa, fontes, GA4 depois de aceitar o aviso). Se algo quebrar, `CSP_LEGADO=true` é a saída temporária.
- [ ] Cada ponto a publicar tem responsável, autorização e vistoria registrados (`npm --prefix server run pontos -- listar` mostra `sem doc`).
- [ ] Backup do MySQL feito **e restaurado em um banco de teste** (backup nunca restaurado não conta).
- [ ] Rodar `npm --prefix server run relatorio-piloto` uma vez para conferir que o relatório abre.

## 3. Conferência pós-deploy
- [ ] `GET /api/saude` responde `{"ok":true,"banco":"ok","versao":"..."}` (`versao` vem de `RELEASE_VERSION`; "desconhecida" significa que a variável não foi definida).
- [ ] Galeria de fotos: `npm --prefix server run midia -- verificar` responde OK (ou `/api/saude` com `midia: "r2"`), e uma foto de teste enviada em Admin → Fotos aparece no app depois de aprovada.
- [ ] `GET /api/config-mapa` mostra a chave (e não `null`).
- [ ] Mapa abre com Google; se não, aparece aviso e o mapa aberto assume.
- [ ] Rodar `BASE_URL=https://seu-app node server/scripts/smoke.mjs` (e `--profundo` com `ADMIN_EMAIL`/`ADMIN_SENHA` de teste).
- [ ] API: `newman run docs/api/mais1km.postman_collection.json --env-var baseUrl=https://SEU-DOMINIO --folder "1 · Saúde e páginas (somente leitura)"` (somente leitura, seguro em produção; detalhes em `docs/api/README.md`).
- [ ] Toque numa tag real: carimbo e carta desbloqueada. Tocar de novo na mesma tag não duplica o carimbo (a carta é única, sem evolução por tempo).

## 4. Google Play
- [ ] Política de privacidade: `https://SEU-DOMINIO/privacidade`.
- [ ] Exclusão de conta: `https://SEU-DOMINIO/excluir-conta` (e dentro do app, em Perfil).
- [ ] Ícone 512×512, imagem de destaque 1024×500, 4 a 8 capturas de tela.
- [ ] Declaração de dados: e-mail, nome, localização aproximada (só com o botão "Estou aqui"), carimbos.
- [ ] Classificação etária e público-alvo: conferir com `docs/PLAY-STORE.md`.

## Pendências de infraestrutura (Easypanel)
- [ ] `CONTATO_EMAIL`: criar a variável em *Environment* (aparece em /privacidade e /excluir-conta). Sem ela a página mostra um aviso genérico.
- [ ] `DATABASE_URL` e demais segredos: manter só como variável de ambiente de execução. No Easypanel, desmarque-os de *Build Args* (o Dockerfile não precisa deles; o build do cliente não lê o banco).
- [ ] Trocar a senha do MySQL: altere no serviço MySQL e atualize `DATABASE_URL` no app; reimplante. Como já há usuários reais, faça fora de horário de pico e teste o login depois.
- [ ] Limpeza do pódio de teste: rode primeiro `node server/scripts/teste-podio.js status`. O comando `limpar` só remove contas `@teste.invalid` e carimbos marcados `teste-podio`; contas de usuários reais não são tocadas (a sua própria conta perde apenas os 2 carimbos de teste, se você os criou).
- [ ] Login: em janela anônima, criar conta, sair e entrar de novo; depois entrar com a mesma conta em outro aparelho ("Já tenho conta · Entrar").

## Monitoramento mínimo (Better Stack)
- [x] Monitores criados em 21/10/2026: `+1 KM · API (saúde + banco)` (procura `"banco":"ok"` em `/api/saude`) e `+1 KM · App (página inicial)`, a cada 3 minutos, com alerta por e-mail e push.
- [ ] Sentry: definir `SENTRY_DSN` no Easypanel, reimplantar e conferir no log a linha `{"type":"monitoramento","sentry":"ligado"}`. Para monitorar latência, definir `SENTRY_TRACES_SAMPLE_RATE=0.05` ou `0.1`; `0` mantém traces desligados.
- [ ] Apagar o monitor de exemplo `google.com` que veio com a conta.
- [ ] Definir `RELEASE_VERSION` (hoje `/api/saude` devolve `"versao":"desconhecida"`), para saber qual deploy está no ar.


## Google Analytics 4 (consentimento)
O GA4 só deve carregar depois do aceite no aviso ou da ativação em Perfil → Estatísticas de uso.
- [ ] Em aba anônima, antes do aceite, não há requisições para `googletagmanager.com` ou `google-analytics.com`.
- [ ] Ao aceitar, o script carrega e o evento `app_opened` aparece no GA4 DebugView.
- [ ] Ao desativar em Perfil, eventos deixam de ser enviados e os cookies `_ga*` são removidos quando possível.
- [ ] Google Signals e retenção de dados revisados no GA4.
- [ ] Política `/privacidade` explica dados, finalidade, consentimento e revogação.
