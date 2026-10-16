# Gamificação

## Pontuação e níveis

| Ação confirmada pelo servidor | Crédito | Regra contra repetição |
|---|---:|---|
| Carimbar um ponto/tag pela primeira vez | 10 XP permanentes | Conta uma vez por tag ao longo da conta |
| Completar um circuito publicado | 20 XP permanentes | Uma única recompensa por circuito concluído; fica registrada mesmo que o catálogo mude |
| Carimbar um ponto distinto na temporada mensal | 10 XP sazonais | Conta uma vez por tag no mês |

O nível usa a escala compartilhada em `shared/gamification.mjs`: 0, 30, 70, 130, 200 e 260 XP. O XP sazonal é independente do XP permanente. A temporada segue o fuso `APP_TZ` (padrão `America/Bahia`), e empates compartilham a posição. Medalhas são marcos de progresso e não dão XP adicional, para evitar pontuar a mesma ação duas vezes.

O servidor calcula os valores a partir de carimbos registrados e circuitos publicados; o cliente só apresenta os totais. As respostas da API de gamificação são enviadas com `Cache-Control: no-store` e exigem uma sessão de conta.

## Privacidade do pódio

A participação é opcional e começa desativada. Para aparecer, a pessoa escolhe um apelido público. O ranking não retorna nome completo, e-mail ou identificador interno; exibe somente o apelido escolhido, pontos distintos e XP do mês. A pessoa pode sair a qualquer momento, o que remove seu apelido da classificação.

## API

| Método e rota | Uso |
|---|---|
| `GET /api/gamificacao/me` | XP permanente, nível, medalhas e preferência privada de participação |
| `GET /api/gamificacao/podio` | Período, três primeiras colocações e resultado da própria conta |
| `PUT /api/gamificacao/participacao` | `{ "optIn": true, "alias": "Apelido" }` para aderir; `{ "optIn": false }` para sair |
