# Pendências (lista viva)

Atualizado em 25/10/2026. Histórico das versões antigas em `docs/historico/`.

## Antes de abrir ao público
- [x] `TAG_KEY_SECRET` definido (confirmado pelo responsável em 31/10/2026).
- [ ] Ativar chaves (`chaves ativar-todos`) e gravar as tags com `?k=` (`docs/seguranca.md`).
- [ ] Autorização, responsável e vistoria registrados para cada ponto a publicar (`docs/comercial/`).
- [ ] Backup do MySQL **restaurado** em banco de teste (adiado por decisão do responsável em 31/10/2026).
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
- [ ] Reduzir `styles.css`/`future.css`/`views.js` (arquivos grandes) por tela.

## Comercial
- [ ] Carta de interesse ou contrato-piloto de pelo menos um comprador/patrocinador (`docs/comercial/carta-interesse.md`).
- [ ] Rodar o piloto com ao menos 20 participantes e decidir pelo relatório (aba *Piloto*).
