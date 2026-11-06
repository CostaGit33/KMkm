# Pendências (lista viva)

Atualizado em 05/11/2026. Histórico das versões antigas em `docs/historico/`.

## Antes de abrir ao público
- [x] `TAG_KEY_SECRET` definido (confirmado pelo responsável em 31/10/2026).
- [x] Chaves ativadas (`chaves ativar-todos`; confirmado pelo responsável em 31/10/2026).
- [ ] Gravar nas tags/QR os links com `?k=` (`chaves urls`; `docs/seguranca.md`).
- [ ] Autorização, responsável e vistoria registrados para cada ponto a publicar (`docs/comercial/`).
- [ ] Backup do MySQL **restaurado** em banco de teste (adiado por decisão do responsável em 31/10/2026).
- [x] Senha do MySQL exposta em log de build trocada (31/10/2026).
- [ ] Conferir CSP no celular (mapa, fontes, GA4 após consentimento).
- [ ] Coordenadas validadas em campo antes de ligar localização por raio.
- [ ] App Android: gerar a chave de release, cadastrar os 4 secrets do GitHub e rodar *Mobile - Release assinado* (`docs/PLAY-STORE.md`, passo 2).
- [ ] Definir `ANDROID_SHA256_CERT_FINGERPRINTS` no Easypanel e conferir que `/.well-known/assetlinks.json` devolve JSON (passo 3).
- [ ] `CONTATO_EMAIL`, `RELEASE_VERSION`, limpar carimbos de teste (`teste-podio limpar`).

## Técnico
- [x] Baseline da auditoria integral registrado em `docs/AUDITORIA-INTEGRAL-2026-11-05.md`; execução por prioridade e validação com evidências.
- [ ] App Android: redefinição por App Link integrada no Flutter; concluir CI e teste em aparelho. A associação verificada do domínio depende de `assetlinks.json` e certificado configurado.
- [x] Limite global de 256 KB para JSON da API e manifesto `manus-routes.json` publicado com rotas públicas e de tag (05/11/2026).
- [ ] Teste de ponta a ponta: criar conta → carimbar → abrir em outro aparelho (hoje só testes unitários e `smoke.mjs` manual).
- [x] Remover do aparelho a cópia do hash da senha; conferir senha só no servidor.
- [ ] Limite de tentativas fora da memória (tabela ou Redis) se houver mais de uma instância.
- [ ] Limpeza automática de contas anônimas antigas.
- [ ] Prova de presença com NTAG 424 DNA (validar assinatura SDM no servidor) se patrocínio pagar por visita comprovada.
- [ ] Carimbo offline com fila e reenvio idempotente.
- [x] Dividir `views.js` (agora fachada + `client/src/views/*.js` por tela) e `styles.css` (agora índice de `client/src/styles/*.css`, na mesma ordem da cascata).
- [ ] Dividir `future.css` (926 linhas) por tela.

## Comercial
- [ ] Carta de interesse ou contrato-piloto de pelo menos um comprador/patrocinador (`docs/comercial/carta-interesse.md`).
- [ ] Rodar o piloto com ao menos 20 participantes e decidir pelo relatório (aba *Piloto*).
