# Kit comercial e operacional do piloto

Modelos para transformar o piloto em operação controlada, como pede `docs/riscos-piloto-eunapolis.md`: **comprador, responsável por ponto, autorização, vistoria e resposta rápida a falhas**.

> Estes textos são **modelos de apoio**, não aconselhamento jurídico. Antes de usar com prefeitura, patrocinador ou empresa, peça a revisão de quem cuida do jurídico. Substitua os campos `[entre colchetes]`.

| Documento | Para quê | Quando |
|---|---|---|
| [proposta-piloto.md](proposta-piloto.md) | Uma página para o comprador/patrocinador entender o piloto, o que recebe e o que paga | Antes de qualquer investimento em código |
| [carta-interesse.md](carta-interesse.md) | Compromisso mínimo e não vinculante de quem diz que pagaria | Para validar que existe comprador |
| [termo-autorizacao-ponto.md](termo-autorizacao-ponto.md) | Autorização do dono/gestor do local para instalar a tag | **Antes** de publicar cada ponto |
| [ficha-vistoria-ponto.md](ficha-vistoria-ponto.md) | Conferência em campo (coordenada, acesso, segurança, tag) | Antes de publicar; repetir a cada 30 dias |
| [kit-parceiro-instalacao.md](kit-parceiro-instalacao.md) | Instruções simples para o estabelecimento que recebe a tag | Na entrega da tag |
| [playbook-suporte-suspensao.md](playbook-suporte-suspensao.md) | O que fazer quando algo dá errado e quando parar o piloto | Durante todo o piloto |

## Como isso se liga ao sistema
- No `/admin → Editar ponto`, registre **responsável, contato, data da autorização e data da vistoria**. Sem isso o ponto não publica (ou exige confirmação, que fica na auditoria).
- A aba **Piloto** do `/admin` (ou `npm --prefix server run relatorio-piloto`) mostra o funil e os **gatilhos de parada**; use-a nas reuniões com o comprador.
- Guarde os termos assinados e as fichas (PDF/foto) numa pasta privada e anote ali o código do ponto (`eu-001`…).

## Ordem recomendada
1. Carta de interesse (há comprador?) → 2. Termos de 5 pontos → 3. Vistoria dos 5 → 4. Gravar tags com chave → 5. Publicar → 6. Medir 2 a 4 semanas → 7. Decidir pelo relatório.
