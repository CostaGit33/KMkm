# ADR-0006 — Telemetria e analytics

**Status:** adiada; matriz de governança pendente.
**Data:** 2026-11-01

## Contexto

A PWA tem GA4 opcional após escolha de consentimento. A API mantém eventos operacionais de integração n8n e sinais de carimbo suspeito, mas não há endpoint/tabelas próprios de telemetria de navegação/dispositivo. A política ainda lista itens de retenção e fornecedores a confirmar.

## Decisão

Não implementar coleta própria, nova tabela, endpoint, rastreamento, bateria ou sensores no MVP. Não reutilizar `integracao_eventos` para analytics. Manter telemetria desacoplada e desligada por padrão no app.

## Condição para reabrir

Aprovar uma matriz por evento com finalidade, dados mínimos, base legal avaliada, consentimento necessário, retenção, responsáveis, acesso e exclusão. Após isso, considerar allowlist limitada, endpoint de lote seguro e eventos sem coordenadas de navegação. Falha de telemetria nunca poderá bloquear o serviço.
