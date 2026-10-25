> **Atualização (25/10/2026).** Esta avaliação foi escrita antes de várias entregas: mapa passou de Leaflet para Google Maps com alternativa OSM; o backend é persistente (MySQL), com contas, recuperação de senha, administração, relatório do piloto, monitoramento e política de privacidade; carimbos têm chave no link, localização opcional e marcação de suspeitos. A conclusão econômica continua valendo: **ativo técnico inicial, negócio ainda não comprovado**. O que falta é comprador/patrocinador, autorização dos pontos e métricas do piloto (use `docs/comercial/` e a aba *Piloto* do `/admin`).

# Avaliação econômica preliminar — +1KM / piloto Eunápolis

**Data de referência:** outubro de 2026  
**Natureza:** estimativa de decisão, não laudo contábil, auditoria financeira ou proposta comercial vinculante.

## Conclusão direta

O +1KM possui um **ativo técnico inicial**, mas ainda não possui um negócio comprovado. O código já contém catálogo de pontos, mapa Leaflet, PWA, jornada, coleções, carimbo por QR, backend Express/MySQL/TiDB, cookies seguros e rate limit. Entretanto, o piloto ainda não tem usuários pagantes, contratos municipais, parceiros autorizados, operação de campo ou receita recorrente comprovada.

Por isso, é necessário separar três números que não são equivalentes:

- **custo de reposição:** quanto custaria construir novamente o software e levá-lo a um piloto real;
- **investimento de prontidão:** quanto falta gastar para Eunápolis operar com segurança;
- **valor econômico atual:** quanto um comprador racional pagaria hoje pelo ativo, considerando risco, ausência de receita e trabalho pendente.

## 1. Quanto já existe

O repositório tem uma base funcional relevante, mas parte dela ainda é demonstrativa. O frontend registra progresso localmente e o backend atende principalmente o fluxo de QR/tag. O banco ainda não possui Eunápolis como catálogo operacional. A autenticação principal continua local, e os pontos do mapa não são automaticamente equivalentes a pontos cadastrados no backend.

A pesquisa territorial de Eunápolis também mostra que apenas três pontos têm coordenadas conferidas no mapa: Praça da Bandeira, Praça da Liberdade e Praça do Pequi. Os demais permanecem com coordenada pendente ou com validação operacional incompleta. As rotas atuais são, em grande parte, propostas editoriais, eventos temporais ou infraestruturas que ainda exigem geometria, endpoints e validação de campo.

Essa base reduz o tempo de construção, mas não pode ser avaliada como produto pronto.

## 2. Custo para tornar Eunápolis operacional

A faixa realista para transformar o demonstrativo em um piloto fechado, com cinco pontos, uma rota e operação mínima, é de **R$ 120 mil a R$ 260 mil**. A variação depende de quanto será feito pelo próprio fundador, do nível de segurança exigido e da necessidade de vistoria presencial.

| Frente | Faixa estimada |
|---|---:|
| Catálogo operacional, banco e API única | R$ 25 mil – R$ 55 mil |
| Migração de conta/progresso local para backend | R$ 20 mil – R$ 45 mil |
| Área administrativa, papéis, auditoria e publicação | R$ 25 mil – R$ 60 mil |
| QR Codes, PDF, rotação, revogação e antifraude básico | R$ 12 mil – R$ 30 mil |
| Validação de campo, rotas, GPX/GeoJSON e documentação | R$ 15 mil – R$ 35 mil |
| QA, segurança, observabilidade, backup e publicação | R$ 15 mil – R$ 35 mil |
| Impressão, instalação e contingência do piloto | R$ 8 mil – R$ 20 mil |
| **Total indicativo do piloto efetivo** | **R$ 120 mil – R$ 260 mil** |

Esses valores não incluem salários permanentes de equipe, deslocamentos frequentes, contratação jurídica, campanhas de mídia relevantes ou aquisição de hardware específico.

Se o objetivo for somente apresentar uma demo comercial mais convincente, sem afirmar operação real, o custo adicional pode ficar em **R$ 20 mil a R$ 60 mil**. Isso, porém, melhora a apresentação, não cria capacidade operacional.

## 3. Custo mensal depois do piloto

Para uma cidade pequena ou média com cinco a quinze pontos ativos, uma operação mínima tende a exigir **R$ 12 mil a R$ 35 mil por mês**, além de custos variáveis.

Esse valor inclui manutenção de software, atendimento, revisão de conteúdo, monitoramento, correções de mapa, administração de QR, suporte aos parceiros e pequenas ações de campo. Uma pessoa acumulando todas as funções pode reduzir o desembolso financeiro, mas não elimina o custo econômico do trabalho.

Se houver equipe comercial, suporte diário, conteúdo frequente ou mais de cinco cidades, a faixa pode subir para **R$ 35 mil a R$ 80 mil por mês**.

## 4. Como o projeto pode render

O modelo mais plausível não é depender inicialmente de assinaturas individuais. O produto tem mais aderência a **B2B/B2G local**, com municípios, comércio, entidades culturais, escolas, eventos e patrocinadores.

### Receita por implantação

Uma edição municipal com catálogo, operação, QR, painel e relatório pode ser vendida por aproximadamente **R$ 40 mil a R$ 120 mil** de implantação, dependendo do escopo e da responsabilidade de campo.

Eunápolis não deveria ser vendida nesse preço antes de possuir uma edição piloto documentada. O primeiro contrato pode ser menor, subsidiado ou patrocinado, em troca de autorização, dados de uso e caso de sucesso.

### Receita recorrente

A licença e operação mensal podem ficar em **R$ 3 mil a R$ 12 mil por cidade**, conforme número de pontos, usuários, suporte e relatórios.

O valor recorrente somente é defensável quando houver conteúdo atualizado, painel, suporte e SLA. Cobrar mensalidade por uma página com mapa estático destruiria a credibilidade comercial.

### Patrocínio local

Comércios, rede hoteleira, shopping, eventos, cooperativas e empresas regionais podem patrocinar coleções ou pontos. Uma faixa inicial plausível é de **R$ 5 mil a R$ 25 mil por patrocinador por edição**, condicionada à entrega mensurável: visitas, carimbos, leads consentidos, participação ou associação de marca.

### Eventos e educação

Corridas, feiras, escolas, universidades e programas de turismo podem comprar edições temporárias entre **R$ 10 mil e R$ 60 mil**, conforme número de participantes, operação, QR, relatório e suporte no evento.

## 5. Cenários de faturamento anual

Os cenários abaixo são hipóteses de planejamento, não previsão. Eles não pressupõem que contratos já existam.

| Cenário | Hipótese | Receita anual estimada | Custo operacional estimado | Resultado operacional indicativo |
|---|---|---:|---:|---:|
| Conservador | 1 cidade, R$ 40 mil de implantação, R$ 4 mil/mês, 2 patrocinadores de R$ 10 mil | R$ 108 mil | R$ 110 mil | **–R$ 2 mil** |
| Base | 3 cidades, R$ 60 mil de implantação por cidade, R$ 6 mil/mês por cidade, 3 patrocinadores de R$ 20 mil | R$ 456 mil | R$ 330 mil | **R$ 126 mil** |
| Expansão | 5 cidades, R$ 90 mil de implantação por cidade, R$ 10 mil/mês por cidade, 8 patrocinadores de R$ 25 mil | R$ 1,25 milhão | R$ 660 mil | **R$ 590 mil** |

O resultado não é lucro líquido. Ainda faltam impostos, despesas comerciais, inadimplência, custos financeiros, remuneração dos sócios e contingências.

O cenário conservador é o mais importante: ele mostra que **uma única cidade provavelmente não sustenta uma empresa com equipe completa**. Eunápolis precisa funcionar como prova comercial para vender a segunda e a terceira cidade, não como negócio isolado dependente de entusiasmo.

## 6. Quanto vale o projeto hoje

### Valor de reposição

Se fosse necessário contratar novamente a construção da base atual, uma faixa razoável seria de **R$ 60 mil a R$ 140 mil**, dependendo de quanto do código existente fosse reaproveitado e da qualidade exigida.

Esse número não é o preço de venda. É uma referência de esforço técnico já incorporado.

### Valor econômico atual

Como ainda não existem contratos, receita, usuários ativos medidos ou autorização formal dos pontos, uma faixa defensável para o ativo hoje é de **R$ 30 mil a R$ 100 mil** em uma negociação entre partes independentes.

A faixa fica abaixo do custo de reposição porque o comprador assumiria:

- risco de integração do frontend com o backend;
- risco de dados territoriais incompletos;
- risco de autorização dos pontos;
- ausência de receita comprovada;
- necessidade de construir administração e operação;
- risco de que a adoção local não aconteça.

Um vendedor pode considerar o código mais valioso por causa do tempo investido. O comprador não paga tempo passado; paga capacidade futura comprovada.

### Valor depois de um piloto bem-sucedido

Com uma edição de Eunápolis concluída, cinco pontos autorizados, uma rota auditada, 100–300 usuários, métricas de uso e pelo menos um contrato ou patrocinador renovável, o valor poderia subir para **R$ 150 mil a R$ 400 mil**.

Com três a cinco cidades pagantes, receita recorrente anualizada de aproximadamente R$ 300 mil a R$ 800 mil e retenção comprovada, o projeto poderia ser avaliado em **R$ 500 mil a R$ 1,5 milhão**, dependendo da margem, concentração de clientes e propriedade dos dados.

Essas faixas não devem ser usadas para pedir investimento antes de haver evidência. Sem receita ou contrato, múltiplo de SaaS é uma narrativa, não uma valuation.

## 7. Ponto de equilíbrio

Com custo mensal de R$ 25 mil, a empresa precisaria de aproximadamente:

- 5 cidades pagando R$ 5 mil/mês; ou
- 3 cidades pagando R$ 8,5 mil/mês; ou
- 2 cidades pagando R$ 12,5 mil/mês.

Patrocínio e implantação podem financiar o início, mas não substituem recorrência. O produto fica vulnerável se depender de uma nova venda para pagar cada mês seguinte.

## 8. O que aumenta valor de verdade

O valor não aumenta significativamente por adicionar mais cidades demonstrativas ao catálogo. Isso aumenta volume de manutenção e pode aumentar o risco editorial.

Os ativos que realmente aumentam valor são:

1. **contrato ou carta de intenção paga;**
2. **pontos autorizados e responsáveis identificados;**
3. **carimbo persistente e auditável no backend;**
4. **painel que permite operar sem editar código;**
5. **usuários ativos e taxa de retorno;**
6. **receita recorrente por cidade;**
7. **métricas de conversão para parceiros;**
8. **processo repetível para lançar uma nova cidade;**
9. **baixo custo de atendimento por cidade;**
10. **dados próprios obtidos com consentimento e governança.**

## Veredito

Hoje, eu não avaliaria o +1KM como uma empresa de software de alto valor. Eu avaliaria como um **protótipo avançado com valor técnico e potencial comercial ainda não provado**.

A decisão racional é investir primeiro entre **R$ 120 mil e R$ 260 mil** para construir uma operação mínima de Eunápolis e tentar obter uma primeira receita real. Depois disso, o projeto pode ser julgado por métricas, não por quantidade de telas ou cidades no catálogo.

O objetivo financeiro da primeira edição não deveria ser maximizar lucro. Deveria ser provar três coisas:

- alguém autoriza e paga;
- usuários realmente usam e retornam;
- a operação pode ser repetida em outra cidade sem multiplicar o custo na mesma proporção.

Sem essas três provas, adicionar novas cidades aumenta o demonstrativo, mas não aumenta necessariamente o valor do negócio.
