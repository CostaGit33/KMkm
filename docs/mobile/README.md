# Migração Android Mais1km

Documentação da Fase 0 e decisões para criar o cliente Android Flutter sem substituir a PWA, compartilhar as regras/API atuais e preservar o MySQL como fonte oficial.

- [Baseline e toolchain](00-baseline.md)
- [Escopo do MVP](01-escopo-mvp.md)
- [Mapa da API](02-mapa-api.md)
- [Arquitetura móvel](03-arquitetura-mobile.md)
- [ADRs — decisões de arquitetura](adr/README.md)

## Estado atual

Fase 0: auditoria e baseline documentadas no commit base `1004923`. O clone está na branch `feature/flutter-android-migration`. Baseline web/backend passou (52 testes do server e build Vite). O gate para criar o scaffold Flutter e executar a prova de conceito de sessão está bloqueado pela ausência de Flutter/Dart/Android SDK neste ambiente.

Não há app Flutter nem alteração de backend/banco nesta fase. Consulte os ADRs para itens propostos, adiados e ainda bloqueados.
