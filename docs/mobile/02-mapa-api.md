# Mapa da API para o cliente Android

**Fonte:** handlers em `server/index.js`, `server/recuperacao-senha.js`, `server/gamificacao.js`, rotas públicas de mídia, testes e `docs/api/openapi.yaml`.
**Base URL:** o app deve usar o domínio HTTPS real configurado para o Mais1km; esse domínio não foi inferido nem testado nesta auditoria.

## Sessão e autenticação

- Cookie: `mais1km_session`; emitido nos endpoints de cadastro/login, HttpOnly, Secure quando HTTPS, SameSite conforme configuração e validade de 30 dias.
- Banco: guarda `token_hash` em `sessoes`, não o token bruto.
- O middleware `auth` aceita cookie ou `Authorization: Bearer`. Se ambos estiverem presentes, o cookie é lido primeiro.
- Os endpoints de conta retornam usuário no JSON e definem cookie; cadastro/login não retornam token Bearer da conta no corpo.
- O endpoint legado `/api/entrar` cria usuário anônimo por apelido e retorna `token`; não usar como fluxo de conta do app novo.
- Não há endpoint de refresh de sessão encontrado. `POST /api/conta/sair` revoga a sessão atual por padrão; `{ todos: true }` revoga as sessões da conta.
- Rotas de gamificação exigem conta registrada; a caderneta aceita o middleware de autenticação também usado por sessões legadas.

**Bloqueio da integração Android:** cookie jar seguro/persistente ainda não foi provado porque Flutter/Dart não estão disponíveis. Recomendação provisória é testar primeiro persistência de cookie segura no cliente nativo; não modificar os endpoints web para entregar Bearer a JavaScript.

## Endpoints do participante

| Método e caminho | Acesso | Entrada essencial | Resultado/erros observados |
|---|---|---|---|
| `GET /api/catalogo` | Público | Nenhum | Catálogo de pontos/circuitos. A descrição OpenAPI informa que inclui pontos não arquivados, mesmo com status diferente de publicado e `oculto=true`; cliente deve tratar status/visibilidade corretamente. |
| `GET /api/config-mapa` | Público | Nenhum | `{ googleMapsKey, googleMapId }`, com valores configuracionais públicos ou `null`; resposta sem cache. Não tratar a chave como segredo de servidor, mas restringi-la no provedor. |
| `GET /api/map-tiles/:z/:x/:y.png` | Público | XYZ inteiro; zoom 0–19 | Tile OpenStreetMap proxied pelo servidor; rejeita tile inválido com `400 { erro: 'tile_invalido' }`; rate limit. |
| `POST /api/conta/criar` | Público | `{ nome, email, senha }` | `201` com `{ usuario: { id, conta_id, nome, email }}` e cookie; valida senha e email; `409 email_ja_cadastrado`, `400 dados_conta_invalidos`/`senha_igual_ao_email`, `429`. Limite 8/10 min por IP. |
| `POST /api/conta/entrar` | Público | `{ email, senha }` | `200` com usuário e cookie; `401 credenciais_invalidas`; rate limits por IP e email. |
| `GET /api/conta/sessao` | Conta autenticada | Cookie/Bearer | `200 { usuario: { id, conta_id, nome, email, admin }}`; `401` sem conta válida. |
| `PUT /api/conta` | Conta autenticada | Nome/email; `senhaAtual` + `senhaNova` quando troca senha/email | `200` usuário atualizado; `400`, `403 senha_atual_invalida`, `409 email_ja_cadastrado`, `401`. Trocar email/senha revoga outras sessões. |
| `POST /api/conta/recuperar-senha` | Público | `{ email }` | Resposta neutra `200 { ok, mensagem }` mesmo se email não existir/não houver configuração; token por email válido 30 min; `429`. Requer integração Resend configurada fora do app. |
| `POST /api/conta/redefinir-senha` | Público | `{ token, senha }` | `200 { ok, email, mensagem }`; `400 token_ou_senha_invalidos` ou `token_invalido_ou_expirado`; revoga sessões existentes. |
| `POST /api/conta/sair` | Autenticado | Opcional `{ todos: true }` | `200 { ok: true }`, revoga sessão e limpa cookie. |
| `POST /api/tags/:codigo/carimbar` | Autenticado | `{ chave?, pos?: { lat, lng, acc } }` | `200` inclui `carimbo`, `rota`, `repetido`, `evento` quando ativo, `criatura`, `hoje`, `turma`, `guardiao`, `certificado`. `404 tag_inexistente`; `403 chave_invalida`; `409` para publicação/localização; `429 muitos_carimbos` ou limite de chamadas. Janela de repetição de 30 min; regra de ritmo aplicada pelo servidor. |
| `POST /api/eventos/:slug/carimbar` | Autenticado | `{ codigo, chave?, pos?: { lat, lng, acc } }` | `200` inclui estado de repetição, se criou carimbo-base de rota, evento, edição e carimbo; `404 evento_inexistente`/`tag_inexistente`; `409` janela, publicação, vínculo ou localização; `429`. |
| `GET /api/caderneta` | Autenticado | Nenhum | `{ usuario, eventos, colecao, rotas }`; cada ponto pode ter `carimbo: null` ou objeto confirmado. |
| `GET /api/gamificacao/me` | Conta autenticada | Nenhum | `{ xp, medals, participation }`; limite 90/min. |
| `GET /api/gamificacao/podio` | Conta autenticada | `periodo=geral` opcional; `limite` opcional | Objeto de período, participantes, classificação, líderes e posição/opt-in do usuário. Sem `periodo=geral`, período mensal atual. |
| `PUT /api/gamificacao/participacao` | Conta autenticada | `{ optIn: boolean, alias?: string }` | `200 { optedIn, alias }`; `400` para participação/apelido inválido. Opt-in explícito; apelido de 2–30 caracteres e sem `@`. |
| `GET /api/pontos/:codigo/imagens` | Público | Código do ponto | Fotos disponíveis conforme rota pública (somente mídia publicada/aprovada). |
| `GET /midia/:arquivo` | Público | Arquivo público referenciado pelo catálogo | Derivado público de foto; não usar URL de mídia administrativa. |
| `DELETE /api/eu` | Autenticado | Nenhum | `200 { ok: true }`; exclui sessão/conta e carimbos em transação; operação destrutiva e deve ser testada apenas com conta de teste. |

`GET /api/saude` é uma verificação operacional. Não deve ser chamado em loop por cada aparelho nem usado para inferir dados pessoais.

## Localização e carimbo

- Cliente web manda posição no body `pos` com os nomes exatos `lat`, `lng`, `acc` (metros); esse formato é validado por `server/tag-acesso.js`.
- Com coordenadas exigidas: precisão deve ser positiva e no máximo 50 m; o raio padrão é 100 m e o limite máximo também é 100 m. O código do servidor é a autoridade final.
- Se faltar posição, o servidor pode responder `409 localizacao_necessaria`; a PWA só então solicita localização precisa e tenta de novo. Ponto sem coordenadas é recusado quando geofence ativa.
- Nenhuma coordenada recebida para essa validação é escrita na linha de carimbo; as suspeitas de deslocamento usam coordenadas cadastradas dos pontos e horários de carimbos anteriores.
- A chave NFC/QR recebida como `?k=` é removida da barra de endereço pela PWA e enviada ao endpoint de carimbo como `chave`. O app nativo deve evitar logs, analytics, crash reports e histórico interno que preservem essa chave.
- Não existe fila offline idempotente aprovada/implementada para carimbo. Uma tentativa sem resposta não significa visita confirmada.

## Erros e identificadores

- Erros de domínio são JSON com campo `erro`; algumas respostas incluem dados adicionais como `raio` e `distancia`.
- O servidor define ou preserva `X-Request-Id`; cliente deve guardar o identificador em diagnóstico controlado, sem incluir credenciais ou coordenadas.
- Há rate limits por rota e em memória no processo. Implementar backoff respeitando `Retry-After` quando existir; não repetir POST de carimbo indefinidamente.

## Divergências/pendências OpenAPI

1. O handler `POST /api/tags/:codigo/carimbar` consome `chave` e `pos`, mas a operação no `openapi.yaml` não descreve claramente um `requestBody` com esses campos.
2. O handler `POST /api/eventos/:slug/carimbar` consome `codigo`, `chave` e `pos`; o schema publicado descreve `codigo`, sem documentar os campos adicionais de chave e localização.
3. A documentação de `GET /api/catalogo` explicita que podem vir itens não publicados e ocultos. O filtro de exibição publicável precisa ser uma regra explícita/testada no cliente, não suposição sobre a resposta.
4. A existência de suporte Bearer no middleware não significa que os endpoints de conta emitam Bearer. Essa compatibilidade deve ser resolvida por prova de conceito, não por inferência.

Atualizar OpenAPI/coleção Postman no mesmo bloco de trabalho em que o contrato for confirmado. Nenhum desses contratos foi alterado na Fase 0.
