# Caderneta de Rotas

PWA mobile-first para registrar carimbos em tags de rotas, com carimbos SVG generativos, progresso por rota, guardião do ponto e carimbo coletivo da turma.

## Estrutura

- `server/`: API Express e inicialização, migrações e seed do MySQL.
- `client/`: frontend React + Vite, servido como PWA.
- `docker-compose.yml`: MySQL local para desenvolvimento.

## Executar localmente

```bash
cp server/.env.example server/.env
npm run setup
docker compose up -d db
npm run db:init
npm run dev:server
```

Em outro terminal:

```bash
npm run dev:client
```

Abra a URL do Vite. Os pontos nascem `pendente` (veja "Somente Eunápolis"); publique-os com o script `pontos` ou em `/admin`.

## Produção

```bash
npm run setup
npm run build
npm start
```

O servidor serve `client/dist` e escuta `PORT` (padrão `3000`). Defina `DATABASE_URL` (`mysql://usuario:senha@host:3306/banco`) para um MySQL persistente e `APP_TZ` (padrão `America/Bahia`) para o dia local. Não versione `server/.env`.

## Observações

- A conta principal é persistente no servidor (senha com scrypt, sessão com hash e validade de 30 dias). O apelido anônimo com token só existe na página pública da tag (`/t/:codigo`).

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


## Pokédex, edição numerada e testes de API (V8.7)
- **Pokédex de Eunápolis:** cada ponto publicado tem uma criatura (`tags.criatura`, `tags.raridade`; o admin pode editar, o resto é preenchido automaticamente). A criatura é "capturada" no primeiro carimbo de rota da pessoa no ponto; não há tabela nova, não dá XP e não entra no pódio. `GET /api/caderneta` devolve `colecao`, e `POST /api/tags/:codigo/carimbar` devolve `criatura` (`nova`, `capturadas`, `total`). Arte gerada no cliente em `client/src/criaturas.js`.
- **Edição numerada patrocinada:** `eventos.tiragem` e `eventos.emitidos`, tabela `edicao_numeros`. O número é emitido dentro da transação do toque, com a linha do card travada (`FOR UPDATE`), um por conta, sem reemissão mesmo se a conta for excluída. O admin define a tiragem no formulário do card; ela trava depois do primeiro carimbo.
- **Páginas públicas:** `/privacidade` e `/excluir-conta` (defina `CONTATO_EMAIL`). Guia da loja em `docs/PLAY-STORE.md`.
- **Testes:** `npm --prefix server test`; `server/scripts/smoke.mjs` (contra qualquer `BASE_URL`, `--profundo` para a edição numerada); coleção `postman/mais1km.postman_collection.json`.
