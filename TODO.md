# Pendências (lista viva)

Atualizado em 25/10/2026. Histórico das versões antigas em `docs/historico/`.

## Antes de abrir ao público
- [ ] Definir `TAG_KEY_SECRET`, ativar chaves e gravar as tags com `?k=` (`docs/seguranca.md`).
- [ ] Autorização, responsável e vistoria registrados para cada ponto a publicar (`docs/comercial/`).
- [ ] Backup do MySQL **restaurado** em banco de teste.
- [x] Senha do MySQL exposta em log de build trocada (31/10/2026).
- [ ] Conferir CSP no celular (mapa, fontes, GA4 após consentimento).
- [ ] Coordenadas validadas em campo antes de ligar localização por raio.
- [ ] `CONTATO_EMAIL`, `RELEASE_VERSION`, limpar carimbos de teste (`teste-podio limpar`).

## Técnico
- [ ] Teste de ponta a ponta: criar conta → carimbar → abrir em outro aparelho (hoje só testes unitários e `smoke.mjs` manual).
- [ ] Remover do aparelho a cópia do hash da senha; conferir senha só no servidor.
- [ ] Limite de tentativas fora da memória (tabela ou Redis) se houver mais de uma instância.
- [ ] Limpeza automática de contas anônimas antigas.
- [ ] Prova de presença com NTAG 424 DNA (validar assinatura SDM no servidor) se patrocínio pagar por visita comprovada.
- [ ] Carimbo offline com fila e reenvio idempotente.
- [x] Dividir `views.js` (agora fachada + `client/src/views/*.js` por tela) e `styles.css` (agora índice de `client/src/styles/*.css`, na mesma ordem da cascata).
- [ ] Dividir `future.css` (926 linhas) por tela.

## Comercial
- [ ] Carta de interesse ou contrato-piloto de pelo menos um comprador/patrocinador (`docs/comercial/carta-interesse.md`).
- [ ] Rodar o piloto com ao menos 20 participantes e decidir pelo relatório (aba *Piloto*).
