# ADR-0002 — Autenticação do cliente Flutter

**Status:** proposta; prova de conceito pendente.
**Data:** 2026-11-01

## Contexto

A API de conta define cookie `HttpOnly` e guarda hash da sessão; o middleware também aceita `Authorization: Bearer`. Cadastro/login de conta não retornam o token Bearer no JSON. Flutter/Dart não estão instalados no ambiente atual, portanto não foi possível testar persistência de cookie no cliente nativo.

## Decisão provisória

Testar primeiro uma sessão via cookie jar persistente com armazenamento protegido pelo sistema operacional. Medir login, persistência após reinício, sessão expirada e logout. Manter os endpoints web e suas respostas inalterados durante a prova de conceito.

## Alternativa se a prova falhar

Desenhar fluxo mobile próprio com token opaco, hash no servidor, armazenamento seguro no cliente e revogação documentada. Não incluir token Bearer em resposta visível a JavaScript dos endpoints usados pela PWA sem análise e aprovação de segurança.

## Gate e consequências

Nenhuma tela autenticada/carimbo Flutter deve ser implementada antes de a prova passar. Não armazenar sessão em texto claro, logs, analytics ou URL. Nenhuma alteração de autenticação foi feita nesta fase.
