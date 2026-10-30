# Histórico de versões do +1 KM

Movido do README para o README ficar curto e atual. Cada seção descreve o que aquela versão entregou; para o estado de hoje, leia o [README](README.md) e [docs/INDEX.md](docs/INDEX.md).

## V8.14 · Igreja Matriz e galeria de fotos
- **Galeria não depende mais do catálogo do aparelho**: a página do ponto sempre consulta `/api/pontos/:codigo/imagens` e mostra “Fotos do lugar” se houver foto aprovada (antes, um catálogo velho guardado no aparelho escondia a seção). Admin → Fotos avisa quando nenhuma foto está aprovada e diz onde elas aparecem. Cache do service worker: `mais1km-v39-galeria-visivel`.
- **Arte da carta pela galeria**: *Fotos → Usar na carta* faz a carta do ponto usar uma foto aprovada (coluna `tags.arte_imagem_id`; prioridade sobre o arquivo `arte`). Só aparece depois do desbloqueio; sai sozinha se a foto for arquivada ou excluída. `scripts/midia.js importar … --aprovar --carta`. Cache do service worker: `mais1km-v38-carta-foto`.
- **Galeria de fotos por ponto** (`docs/midia.md`): tabela `ponto_imagens`; envio em Admin → Pontos → *Fotos* ou `scripts/midia.js`. O original fica intacto num bucket privado (R2, ou volume em `MEDIA_DIR`); o servidor gera WebP de 1400 px e miniatura de 320 px **sem EXIF/GPS** e entrega por `/midia/…` com cache imutável. Tudo entra *pendente* e só aparece no app depois de aprovado.
- **Crédito e restauração**: foto histórica ou restaurada exige autor ou fonte para aprovar (forçar fica na auditoria); restauração é marcada como derivada de outra foto e aparece com selo. Sem colorização ou "melhoria" por IA.
- **No app**: faixa de fotos no ponto, ampliação com legenda e crédito e comparador "Antes / Hoje" quando há uma histórica e uma atual aprovadas. O catálogo traz `capa` e `fotos`.
- **API**: `GET /api/pontos/:codigo/imagens`, `GET /midia/:arquivo` e rotas `/api/admin/…/imagens` (OpenAPI atualizado). Testes: unitários de processamento/armazenamento e `scripts/e2e-midia.mjs` (disco e R2 simulado).
- Variáveis novas: `R2_ACCOUNT_ID`/`R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `MEDIA_DIR`. `/api/saude` informa `midia`. Cache do service worker: `mais1km-v37-galeria` (depois `v38`).

- **Ponto Igreja Matriz** (`eu-015`, ou o próximo código livre): entra no catálogo como `pendente`, sem coordenada nem tag, no Circuito Cultural Central. A pesquisa do projeto já a listava nesse circuito, mas ela nunca tinha sido cadastrada. A migração `008_igreja_matriz` roda uma vez, não duplica se a administração já cadastrou uma Matriz e não sobrescreve campos já preenchidos.
- **Carta Comum da Matriz**: personagem "Torre da Matriz", categoria História, arte `matriz-comum.webp` (foto atual, 800×800). Textos neutros, editáveis no painel admin. Falta no painel: coordenada, endereço, responsável, autorização e vistoria antes de publicar.

## V8.13 · Segurança do carimbo e da conta, operação do piloto
- **Chave no link da tag** (`/t/eu-001?k=…`, HMAC com `TAG_KEY_SECRET`): impede adivinhar códigos; girar a chave revoga o link antigo. Admin → *Link da tag*, CSV de links e `scripts/chaves.js`.
- **Localização opcional por ponto** (`raio_m` ou `GEOFENCE_RAIO_PADRAO_M`): só é pedida quando o ponto exige; a coordenada não é guardada.
- **Carimbos suspeitos** (deslocamento impossível, ritmo alto) são marcados em `carimbos.suspeito`; mais de 15 carimbos novos em 10 minutos são bloqueados.
- **CSP estrita** (sem `unsafe-inline`/`unsafe-eval` em scripts), GA4 liberado, `frame-ancestors 'self'`; saída temporária `CSP_LEGADO=true`.
- **Conta**: trocar e-mail ou senha exige a senha atual e encerra as outras sessões; cookie `SameSite=Lax`; limite de tentativas de login também por e-mail; tempo de resposta igual para e-mail inexistente; sair encerra só a sessão atual; no máximo 10 sessões por conta; verificação de origem em pedidos que alteram dados.
- **Operação**: responsável, autorização e vistoria por ponto, exigidos para publicar (`EXIGIR_AUTORIZACAO`); aba *Piloto* no `/admin` e `scripts/relatorio-piloto.js` com funil e gatilhos de parada; modelos em `docs/comercial/`.
- Documentação reorganizada: histórico em `docs/historico/`, índice em `docs/INDEX.md`.

## Somente Eunápolis (V8)

Eunápolis é a cidade piloto e a única do projeto: um catálogo de 18 pontos no app, sem seletor de cidade, e uma rota piloto de 8 pontos no servidor (`eu-001`, `eu-002`, `eu-003`, `eu-004`, `eu-007`, `eu-008`, `eu-009`, `eu-011`). A lógica de eventos e patrocínio continua igual.

- Os 8 pontos do servidor nascem `pendente`: não recebem carimbo nem entram em cards até a validação em campo. Para publicar: `npm --prefix server run pontos -- publicar eu-001 eu-002 ...` (`listar` e `despublicar` também existem).
- Bancos antigos: a migração `003_somente_eunapolis` (roda uma vez) arquiva rotas e pontos de outras cidades e da rota de demonstração, cancela cards ligados a eles e renomeia a rota piloto para "Eunápolis · Piloto". Carimbos já gravados não são apagados; só deixam de aparecer na caderneta.
- No aparelho, o estado salvo é migrado para a chave `mais1km-eunapolis:v4`: conta e perfil continuam e pontos de outras cidades são descartados.

## Mapa interativo (V8.1)

- Marcadores numerados por estado (conquistado, disponível, mistério), com pulso no próximo ponto e linha animada da rota escolhida.
- **Percorrer** voa de ponto em ponto; **Enquadrar** mostra tudo; **Estou aqui** mostra sua posição, a distância até cada ponto e avisa "Você chegou" a até 100 m (a localização fica só no aparelho).
- **Marcar no mapa / Ajustar posição / Usar minha posição**: registra no aparelho onde a tag está fixada (chave `mais1km-eunapolis:marcas:v1`). **Copiar marcações (CSV)** exporta a lista para validar e publicar o ponto.
- Hoje 6 dos 14 pontos visíveis têm coordenada: 3 do OpenStreetMap e 3 do Google Maps (EU-003, EU-009, EU-011), todas ainda sem validação em campo. Os demais aparecem em "sem localização" até serem marcados. Pontos em mistério não mostram o nome.
- Sem imagens de mapa (offline ou proxy fora do ar) aparece uma grade neutra e um aviso; os pontos continuam na posição certa.
- O servidor passou a permitir geolocalização na própria origem (`Permissions-Policy: geolocation=(self)`).

## Eventos e patrocínios (V7)

Cards com janela de datas sobre as tags da rota. A rota e o certificado não mudam: um toque gera o carimbo da rota e, se houver um card ativo no ponto, o carimbo do card, separados na caderneta. Detalhes, regras e comandos em `docs/eventos-patrocinio.md`.

```bash
npm --prefix server run evento -- criar --slug rota-do-cafe --nome "Rota do Café" --tipo patrocinio \
  --patrocinador "Café X" --inicio "2026-11-01 00:00" --fim "2026-11-30 23:59" \
  --tags eu-001,eu-002,eu-003,eu-004,eu-007,eu-009 --publicar
npm --prefix server run evento -- listar
npm --prefix server run evento -- relatorio rota-do-cafe
```

## Administração (V8.4)

Página `/admin` para adicionar, remover e organizar pontos, rotas, circuitos, eventos e pessoas (arrastar e soltar).
Promova sua conta com `node server/scripts/admin.js promover SEU@EMAIL`. Guia completo: `docs/admin.md`; testes: `docs/verificacao-v8.4.md`.

## Página inicial (V8.4.1)
Em "Progresso da cidade": carimbos conquistados em miniatura (toque abre o ponto) e um mapa rápido com os pontos que têm coordenada (conquistado / disponível / mistério), como atalhos. "Mapa completo" abre o mapa grande. Pontos sem coordenada aparecem só na lista; cadastre as coordenadas em /admin.

## Versão de publicação (V8.5)
Sem conteúdo demonstrativo: removidos o botão "Reiniciar demonstração", o carimbo manual sem tag, os marcos simulados da jornada, os carimbos de exemplo pré-preenchidos, o número de caderneta fixo (0042), a turma de teste `PEDAL` (a migração `005_sem_demonstracao` remove a turma de bancos antigos, se não tiver membros) e arquivos de ferramenta externa. O tema escuro é o padrão; o claro só vale quando a pessoa escolhe no menu.


## XP, ranking e testes (V8.6)
- **Jornada removida:** o progresso agora é só XP, níveis (máximo 220 XP: 14 pontos + 4 circuitos), medalhas e ranking.
- **Ranking:** abas "Este mês" (10 XP por ponto diferente carimbado no mês) e "Geral" (XP permanente, com nível de cada pessoa); top 3 em pódio, posições 4º ao 25º em lista (10 visíveis, "ver mais"), posição própria com quanto falta para subir e vencedores do mês anterior. Empate de XP: vence quem chegou primeiro. Só aparece quem ativa "Participar do pódio público" (apelido).
- **Testar o pódio sem dados reais:** `node server/scripts/teste-podio.js criar seu@email.com` cria 2 participantes fictícios (Ana e Beto, domínio `@teste.invalid`) e dá 2 carimbos de teste à sua conta; `... limpar` apaga tudo (carimbos de teste ficam marcados em `carimbos.especial = 'teste-podio'`). Rode `limpar` antes de publicar.


## coleção, edição numerada e testes de API (V8.7)
- **Coleção de cartas de Eunápolis:** cada ponto publicado tem um personagem (`tags.criatura`, `tags.raridade`; o admin pode editar, o resto é preenchido automaticamente). O personagem é desbloqueado no primeiro carimbo de rota da pessoa no ponto; não há tabela nova, não dá XP e não entra no pódio. `GET /api/caderneta` devolve `colecao`, e `POST /api/tags/:codigo/carimbar` devolve `criatura` (`nova`, `capturadas`, `total`). Arte gerada no cliente em `client/src/criaturas.js`.
- **Edição numerada patrocinada:** `eventos.tiragem` e `eventos.emitidos`, tabela `edicao_numeros`. O número é emitido dentro da transação do toque, com a linha do card travada (`FOR UPDATE`), um por conta, sem reemissão mesmo se a conta for excluída. O admin define a tiragem no formulário do card; ela trava depois do primeiro carimbo.
- **Páginas públicas:** `/privacidade` e `/excluir-conta` (defina `CONTATO_EMAIL`). Guia da loja em `docs/PLAY-STORE.md`.
- **Testes:** `npm --prefix server test`; `server/scripts/smoke.mjs` (contra qualquer `BASE_URL`, `--profundo` para a edição numerada); contrato OpenAPI e coleção Postman/newman em `docs/api/` (veja `docs/api/README.md`).

## V8.10 · Cartas únicas, sem evolução por tempo
Cada ponto publicado é uma carta única numerada (personagem, local, categoria, raridade). O primeiro carimbo de rota desbloqueia a carta definitivamente; não há estágios, contagem de dias nem exigência de retorno em datas diferentes. Eventos e patrocínios continuam sendo colecionáveis independentes, com janela de validade e, quando configurado, edição numerada limitada a uma por conta. Seis categorias: Natureza, História, Cultura, Trabalho, Litoral, Mistério. A ilustração final de cada carta vai em `client/public/cartas/` e o nome do arquivo é definido no painel admin (campo "Arte"); sem arquivo, usa-se um desenho gerado. Visual: verde profundo e dourado, fontes Cinzel, Montserrat e Yellowtail.

## V8.12 · Usabilidade e consistência
- **Próximo passo** no topo da Caderneta (um único botão grande para o mapa); some quando a coleção está completa.
- **Um só total**: Caderneta, Coleção e certificados usam o total de cartas publicadas informado pelo servidor.
- **Página `/como-funciona`** (3 passos), ligada no menu "Mais"; páginas públicas no mesmo tema verde e dourado.
- **Mensagens de erro claras** (muitas tentativas, sem internet, falha do servidor) em login, cadastro e perfil.
- Correção no servidor: `/admin` e o `index.html` não chamam mais `next()` após enviar o arquivo (fim dos `ERR_HTTP_HEADERS_SENT` nos logs).
- **Login para conta existente**: "Já tenho conta · Entrar" na abertura e na tela de cadastro (aparelho novo ou app reinstalado), com alternância entre entrar e criar; o e-mail digitado é mantido após um erro.
- **Identidade verde e dourado também no ícone e na abertura**: ícone do app (SVG e PNGs 192/512/maskable), `stamp.svg`, animação de abertura, selo holográfico e cores do manifesto/tema; erro de campo continua em vermelho.
- **Textos do cadastro alinhados ao comportamento real** (senha de 8+ caracteres; conta e carimbos ficam no servidor) e checklist sem a evolução por tempo.
- Checklist de infraestrutura atualizado em `docs/DEPLOY-CHECKLIST.md`.

## V8.11 · Carimbo que desbloqueia carta
O carimbo continua sendo o registro técnico da visita no banco, mas não existe mais uma coleção paralela de carimbos no cliente. `GET /api/caderneta` devolve a coleção de cartas como fonte de verdade; cada ponto publicado aparece como uma carta bloqueada ou conquistada, e o primeiro carimbo de rota apenas desbloqueia essa carta. A home, o histórico, os atalhos e a sincronização usam a mesma coleção. Eventos e patrocínios continuam registros complementares da visita e não criam uma segunda coleção de pontos.

## V8.9 · Rodapé único e Google Maps
- **Rodapé:** todas as opções ficam na barra inferior: Caderneta, Mapa, Rotas, Coleção, Pódio e **Mais** (folha com Guia, Certificados, Perfil, tema e instalar). O topo mostra só a marca. No desktop a barra lateral tem os mesmos itens.
- **Google Maps:** defina `GOOGLE_MAPS_API_KEY` (e, opcionalmente, `GOOGLE_MAP_ID`) nas variáveis de ambiente do serviço (não são argumentos de build). A chave é pública por natureza: no Google Cloud, habilite "Maps JavaScript API" e restrinja a chave aos domínios do app. Sem chave, ou se o Google falhar ou recusar a chave, o app usa o mapa aberto (OpenStreetMap) automaticamente. O servidor entrega a chave em `GET /api/config-mapa`.
- **Mapa:** marcadores no padrão das cartas (verde e dourado), tipo de mapa (satélite), Street View e link "Ver a rua" em cada ponto, "Como chegar" no Google Maps.
