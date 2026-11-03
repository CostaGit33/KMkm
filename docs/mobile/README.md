# Migração Android Mais1km

Documentação da Fase 0 e decisões para criar o cliente Android Flutter sem substituir a PWA, compartilhar as regras/API atuais e preservar o MySQL como fonte oficial.

- [Baseline e toolchain](00-baseline.md)
- [Escopo do MVP](01-escopo-mvp.md)
- [Mapa da API](02-mapa-api.md)
- [Arquitetura móvel](03-arquitetura-mobile.md)
- [ADRs — decisões de arquitetura](adr/README.md)

## Estado atual (2026-11-02)

- Fase 0 (auditoria) e Fase 1 (contrato da API/OpenAPI e teste estático de contrato) concluídas **em documentação**; estão na `main`.
- Baseline: 52 testes do server e build Vite passaram em 2026-11-01. Desde 2026-11-02 rodam no GitHub Actions (`api.yml`, `pwa.yml`).
- Flutter e Android SDK estão instalados na VPS, mas builds devem usar o GitHub Actions. Ainda **não existe** `mobile/`, app Flutter nem workflow Android.
- Decisões em aberto: URL de homologação, conta de teste (prova de autenticação), assinatura/fingerprints. `applicationId` confirmado pelo responsável: `online.novaagencian8n.mais1km`.
- Próximos passos, em ordem: (1) gerar o scaffold via workflow `mobile-scaffold.yml` e revisar por Pull Request; (2) autenticação e prova de persistência de sessão; (3) workflow Android; (4) catálogo, mapa, pontos, NFC/QR e carimbos; (5) testes de integração Android ↔ PWA ↔ API.

Nenhuma alteração de backend, banco ou produção foi feita. Consulte os ADRs para itens propostos, adiados e bloqueados.
