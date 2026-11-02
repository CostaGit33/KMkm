# ADRs — decisões da migração Android

Os ADRs guardam contexto, decisão atual e pontos que ainda precisam de prova ou aprovação.

1. [Local do app no monorepo](0001-local-do-app.md) — padrão `mobile/`, scaffold ainda não criado (será gerado por workflow e revisado por PR).
2. [Autenticação](0002-autenticacao.md) — prova de conceito de cookie jar pendente.
3. [Mapas](0003-mapas.md) — provedor nativo em aberto.
4. [Deep links NFC/QR](0004-deep-links-nfc-qr.md) — preservar tags; configuração depende de domínio e assinatura confirmados.
5. [Offline](0005-offline.md) — fora do MVP online; falta idempotência server-side.
6. [Telemetria](0006-telemetria.md) — adiada até aprovação da matriz de governança.

Estes documentos não autorizam mudanças em produção, compra de tags, coleta de dados ou publicação.
