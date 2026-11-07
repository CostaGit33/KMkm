# Migração Android — histórico da tentativa Flutter

**Status em 2026-11-04: Flutter suspenso como estratégia de implementação.**

A decisão atual é preservar o PWA existente como aplicação principal e empacotá-lo para Android com Capacitor. A documentação vigente está em [`docs/capacitor/README.md`](../capacitor/README.md).

Esta pasta foi mantida como histórico técnico da tentativa Flutter, incluindo baseline, escopo, mapeamento da API e decisões anteriores. Não usar o escopo Flutter como requisito para a nova implementação sem reavaliá-lo à luz do PWA atual.

## Estado do código Flutter

- O diretório `mobile/` e a branch/PR Flutter foram criados durante a tentativa anterior.
- O PR #41 (`fix/flutter-nfc-tag-reader`) não deve ser mesclado como parte da migração Capacitor.
- Nenhuma remoção do diretório Flutter foi feita nesta decisão; ele permanece preservado até uma revisão separada.
- Não ampliar o cliente Flutter enquanto a implementação Capacitor estiver em andamento.

## Referências históricas

- [Baseline Flutter](00-baseline.md)
- [Escopo Flutter](01-escopo-mvp.md)
- [Mapa da API](02-mapa-api.md)
- [Arquitetura Flutter](03-arquitetura-mobile.md)
- [ADRs Flutter](adr/README.md)

## Restrições que continuam válidas

A API Node/Express e o MySQL atuais continuam como fonte única da verdade. A sessão `mais1km_session` HttpOnly deve ser preservada sem exposição ao JavaScript. Carimbos só são confirmados pelo servidor; GPS é solicitado apenas no fluxo de carimbo; tags NFC/QR e links existentes devem continuar funcionando. Não alterar produção nem publicar aplicativo sem autorização.
