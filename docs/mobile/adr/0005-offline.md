# ADR-0005 — Operações offline

**Status:** adiada para depois do MVP online.
**Data:** 2026-11-01

## Contexto

O fluxo atual confirma carimbos no backend. Não foi encontrada fila offline de carimbos nem chave idempotente para cada tentativa. Guardar um POST local e reenviá-lo pode produzir ambiguidade ou duplicidade.

## Decisão

Não incluir SQLite/Drift, fila offline ou confirmação visual de carimbo offline no primeiro corte. Em perda de conexão, explicar que a visita não foi confirmada e oferecer nova tentativa segura.

## Condição para reabrir

Definir necessidade de produto e UX “pendente”, contrato idempotente no backend, expiração/retry, proteção contra duplicidade, sincronização e teste em staging. Só depois escolher persistência local e migrar dados.
