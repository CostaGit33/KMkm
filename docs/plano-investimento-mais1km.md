# Plano de investimento imediato — +1KM

## Decisão

O próximo investimento não deve ser para adicionar cidades, criar novas telas ou ampliar a estética V6. Deve ser para reduzir três riscos: **ninguém pagar**, **ninguém usar** e **a operação não conseguir sustentar os dados reais**.

A recomendação é investir por etapas, liberando a próxima tranche apenas quando a anterior gerar evidência.

## Tranche 0 — provar demanda antes de programar mais

**Faixa:** R$ 5 mil–15 mil  
**Prazo:** 2–4 semanas

Aplicar em:

- reuniões com Prefeitura, Secretaria de Turismo, cultura, esporte e parceiros locais;
- entrevista com visitantes, corredores, ciclistas, escolas e comércio;
- apresentação de uma proposta comercial simples;
- desenho da primeira edição com cinco pontos;
- obtenção de pelo menos uma carta de interesse ou proposta de patrocínio;
- definição de quem autoriza e mantém cada QR.

**Não aplicar nesta fase:** novas cidades, novas animações, vídeo promocional, dezenas de pontos ou sistema completo de administração.

**Liberar a próxima tranche somente se houver:**

- pelo menos cinco pontos candidatos com responsáveis identificados;
- dois parceiros dispostos a testar;
- vinte participantes potenciais;
- uma conversa concreta sobre preço, patrocínio ou contrato;
- uma rota candidata que alguém local aceite validar.

Se não houver interesse comercial nessa fase, o problema não é técnico. É de produto, comprador ou proposta de valor.

## Tranche 1 — construir a verdade operacional mínima

**Faixa:** R$ 45 mil–90 mil  
**Prazo:** 6–10 semanas

Aplicar em:

- catálogo de Eunápolis no banco;
- cidade, ponto, rota, fonte, status e versão editorial;
- API única para catálogo e caderneta;
- migração do carimbo local para validação no backend;
- conta persistente e sessão segura;
- cinco pontos com coordenadas de campo;
- uma rota com GPX/GeoJSON ou traçado validado;
- QR Codes versionados e revogáveis;
- logs e backup básico.

O objetivo não é construir a plataforma definitiva. É impedir que frontend, banco e realidade territorial tenham informações diferentes.

**Critério de aceite:** limpar o navegador, usar outro dispositivo e recuperar a mesma caderneta; um ponto não publicado não pode gerar carimbo; um QR suspenso precisa parar de funcionar.

## Tranche 2 — executar o piloto fechado

**Faixa:** R$ 25 mil–60 mil  
**Prazo:** 4–8 semanas

Aplicar em:

- vistoria e instalação dos QR;
- impressão e materiais físicos;
- treinamento dos parceiros;
- suporte durante o piloto;
- monitoramento de falhas;
- entrevistas e análise de uso;
- correção de pontos, rota e fluxo de carimbo;
- relatório comercial para apresentar a outros municípios.

Operar com 20–50 participantes e uma janela curta. O piloto deve ser pequeno o suficiente para corrigir problemas sem destruir reputação.

**Métricas mínimas:**

- mais de 90% dos QR funcionando;
- menos de 5% de falhas técnicas de carimbo;
- pelo menos 30% dos participantes usando mais de uma vez;
- nenhum incidente crítico de segurança ou acesso;
- parceiro capaz de solicitar correção ou suspensão sem depender do programador.

## Tranche 3 — administração e venda repetível

**Faixa:** R$ 35 mil–80 mil  
**Prazo:** somente depois do piloto

Aplicar em:

- área administrativa com papéis;
- aprovação de pontos e rotas;
- auditoria de alterações;
- geração de QR e PDF;
- suspensão e rotação de códigos;
- relatório para patrocinador ou Prefeitura;
- pacote comercial replicável;
- landing page e materiais de venda;
- onboarding de uma segunda cidade.

Não construir essa tranche antes de saber quais funções o operador realmente usa. Um painel grande sem operação validada é apenas custo afundado.

## Orçamento recomendado

Se houver capital para uma execução completa, eu reservaria **R$ 100 mil–165 mil inicialmente**, assim:

| Uso | Faixa |
|---|---:|
| Descoberta comercial e parceiros | R$ 5 mil–15 mil |
| Integração operacional mínima | R$ 45 mil–90 mil |
| Campo, QR e piloto | R$ 25 mil–60 mil |
| Reserva para correções | R$ 25 mil–40 mil |
| **Total inicial recomendado** | **R$ 100 mil–165 mil** |

Eu não comprometeria imediatamente os R$ 260 mil superiores da estimativa anterior. Esse teto só faria sentido depois de uma carta de intenção, parceiro local e sinais de uso.

## O que não merece investimento agora

Não priorizar:

- novos pontos sem responsável e validação;
- mais mapas decorativos;
- expansão do design V6;
- aplicativo nativo antes de provar o PWA;
- ranking, gamificação complexa ou rede social;
- inteligência artificial sem problema operacional definido;
- compra de hardware de QR;
- vídeo promocional antes de haver uma história real de uso;
- contratação de equipe grande antes de existir venda.

Esses itens podem aumentar a aparência do produto e não aumentar o valor econômico.

## Regra de decisão em 90 dias

Ao final do primeiro ciclo, continuar somente se houver simultaneamente:

1. cinco pontos autorizados;
2. uma rota efetivamente validada;
3. pelo menos 20 usuários no piloto;
4. uso repetido mensurável;
5. dois parceiros ativos;
6. uma proposta comercial ou carta de intenção;
7. nenhum bloqueio grave de persistência ou operação.

Sem esses sinais, parar a expansão e revisar o comprador, o preço, a proposta ou o formato do produto. Não responder a um problema comercial adicionando código.

## Veredito

Eu investiria agora em **validação comercial + integração operacional mínima + piloto de Eunápolis**.

Não investiria agora em escala.

A ordem econômica correta é:

> **vender o piloto → validar o campo → integrar a verdade no backend → medir uso → repetir em outra cidade.**

A pior decisão seria gastar todo o orçamento tornando o demonstrativo maior antes de descobrir se alguém paga pela operação.
