# ADR-0001 — Localização do app Android

**Status:** aceita como padrão de trabalho, condicionada a validação no scaffold.
**Data:** 2026-11-01

## Contexto

O monorepo tem `client/`, `server/`, `shared/` e documentação. `mobile/` não existia no baseline; os deploys/CI atuais operam sobre client e server.

## Decisão

Criar o novo cliente Flutter em `mobile/`, mantendo builds e release Android separados. Não reutilizar nem substituir o frontend PWA. Confirmar no primeiro scaffold que o pipeline web/backend ignora arquivos Flutter e não inclui artefatos Android no deploy Node.

## Consequências

A documentação e revisão ficam junto da API que o app consome. A CI poderá ganhar job Flutter próprio após versão SDK ser definida. Não alterar os scripts web/server para criar ou publicar o app. Se a CI/hosting atual acoplar o novo diretório de forma insegura, parar e reavaliar.
