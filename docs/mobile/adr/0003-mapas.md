# ADR-0003 — Provedor de mapas nativo

**Status:** em aberto.
**Data:** 2026-11-01

## Contexto

A PWA carrega Google Maps quando recebe configuração/chave do servidor e usa Leaflet/OpenStreetMap como alternativa; o backend também fornece tiles OSM. Isso não confirma qual provedor está ativo em produção nem qual SDK Android deve ser usado. Não há `applicationId` ou chave Android restrita documentada.

## Decisão

Não escolher nem adicionar SDK de mapa Flutter na Fase 0. O catálogo e as coordenadas dos pontos continuam vindo da API. Fazer prova de conceito quando Flutter/Android SDK estiver disponível, comparando alternativa OSM e Google Maps em custo, atribuição/licença, UX, chaves restritas e manutenção.

## Consequências

Não reutilizar uma chave web irrestrita como chave Android. Não bloquear a exploração do catálogo por falta de localização. A escolha de tiles/SDK deve ser registrada antes de depender dela para MVP.
