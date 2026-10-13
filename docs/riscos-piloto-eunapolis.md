# Riscos comerciais e operacionais — piloto Eunápolis

## Leitura executiva

O maior risco do piloto não é o mapa ter uma coordenada errada. É colocar o produto em campo antes de existir um comprador, um responsável por cada ponto e uma resposta rápida para falhas.

O piloto deve ser tratado como uma operação controlada, não como lançamento público. A cidade precisa ter poucos pontos, responsáveis identificados, uma rota validada, QR revogável, suporte e critérios de suspensão.

## Matriz prioritária

| Risco | Tipo | Probabilidade | Impacto | Mitigação principal | Gatilho de parada |
|---|---|---:|---:|---|---|
| Ninguém pagar depois do teste | Comercial | Alta | Muito alto | Validar preço e comprador antes de ampliar código; obter carta de interesse ou contrato-piloto | Nenhum comprador ou patrocinador demonstra compromisso após entrevistas e demonstração |
| Prefeitura ou parceiro não autorizar instalação | Comercial/operacional | Média-alta | Muito alto | Termo simples de autorização, responsável nominal, canal de suspensão e regra de uso de marca | Ponto sem autorização escrita ou responsável acessível |
| Usuário não perceber valor | Comercial | Alta | Alto | Testar proposta com 20–50 pessoas; medir retorno, conclusão e indicação | Menos de 30% dos participantes voltam a usar ou concluem mais de um ponto |
| Conteúdo/mapa errado | Operacional/reputacional | Média | Muito alto | Vistoria de cinco pontos, evidência de campo, revisão por duas pessoas e status publicado/pendente | Divergência de endereço, coordenada ou nome sem correção confirmada |
| Rota insegura ou impraticável | Operacional/reputacional | Média | Muito alto | GPX/GeoJSON, teste presencial, avaliação de tráfego, piso, iluminação, travessias e clima | Não há responsável pela rota, traçado verificável ou condição de suspensão |
| QR copiado ou compartilhado | Operacional/fraude | Média-alta | Alto | Código aleatório, rotação, revogação, rate limit, detecção de padrão impossível e auditoria | Pico anormal, uso simultâneo incompatível ou repetição fora da regra |
| Carimbo local divergir do backend | Técnico/operacional | Alta no estado atual | Muito alto | Uma fonte de verdade; servidor valida e grava; outro dispositivo deve recuperar a mesma caderneta | Qualquer carimbo efetivo só existir no `localStorage` |
| Falha de internet no ponto | Operacional | Média | Alto | Tela de indisponibilidade honesta, fila pendente, retry idempotente e telefone de suporte | Usuário recebe “concluído” sem confirmação do servidor |
| Parceiro abandona a manutenção | Operacional/comercial | Média | Alto | SLA simples, responsável reserva, vistoria periódica e QR substituível | QR ausente, ilegível ou ponto fechado sem aviso |
| Evento, obra ou horário mudar | Operacional | Média | Alto | `valid_from`, `valid_to`, última verificação, suspensão rápida e revisão periódica | Conteúdo vencido continua publicado sem aviso |
| Exposição de dados pessoais | Legal/técnico | Média | Muito alto | Minimização de dados, sessão HttpOnly, consentimento, retenção, exclusão e logs protegidos | Dados de ranking/localização/fotos coletados sem finalidade e consentimento claros |
| Suporte lento durante o piloto | Operacional | Média | Alto | Um operador de plantão, canal único e playbook de incidentes | Falhas ficam sem resposta por mais de um dia durante a edição |
| Escopo crescer antes de validar | Financeiro/gestão | Alta | Alto | Congelar cinco pontos e uma rota; mudanças entram em fila após o piloto | Inclusão de novas cidades ou funcionalidades sem métrica que justifique |
| Custo de campo superar receita | Financeiro | Média-alta | Alto | Orçamento por edição, teto de deslocamento, patrocinador e reserva de 20–30% | Custo previsto não cabe no preço ou patrocínio confirmado |

## Principais riscos comerciais

### 1. Construir para um comprador que não existe

A existência de interesse informal não é demanda pagante. Prefeitura pode elogiar o produto sem ter orçamento, competência ou prioridade para contratar. Comércio pode gostar da visibilidade e não querer pagar. Usuário pode achar interessante e não retornar.

A mitigação é converter conversa em evidência: quem compra, qual problema compra, qual orçamento, qual prazo, qual responsável e qual entrega. Antes da tranche técnica maior, obter pelo menos uma carta de interesse, patrocínio ou contrato-piloto com escopo e valor.

### 2. Proposta de valor confusa

O produto pode ser percebido como mapa, guia turístico, campanha de marketing, jogo, sistema de QR ou caderneta. Se cada interlocutor entender uma coisa, ninguém saberá pelo que está pagando.

Para Eunápolis, a proposta inicial deve ser estreita: **uma edição territorial controlada, com cinco pontos, uma rota validada, carimbos auditáveis e relatório de uso**. Não vender “plataforma de todas as cidades” antes de provar a edição.

### 3. Dependência de um único patrocinador ou órgão

Se a Prefeitura muda de gestão, o comércio desiste ou o parceiro deixa de responder, o piloto pode perder autorização e financiamento.

Mitigar com dois ou mais apoiadores, contrato com vigência, responsável substituto e ativos revogáveis. O projeto não pode depender de uma pessoa que concentra autorização, manutenção e pagamento.

### 4. Usuários não serem usuários reais

Convidados próximos, servidores e participantes pagos podem produzir uma impressão artificial de adesão. O indicador relevante é uso espontâneo ou retorno sem incentivo excessivo.

Separar claramente convidados de usuários orgânicos e medir: primeiro acesso, segundo ponto, retorno em sete dias, conclusão da rota, indicação e reclamações.

## Principais riscos operacionais

### 1. Dados do software não representarem o território

Hoje há três pontos de Eunápolis com coordenadas conferidas e outros itens pendentes. A documentação também informa que horários, acessibilidade, segurança, estado do piso e operação atual ainda precisam de confirmação.

A mitigação é reduzir o lançamento para cinco pontos e manter todo o restante como editorial ou pendente. O ponto só deve aparecer como publicado após documentação e vistoria.

### 2. Rota editorial ser confundida com rota segura

Uma sequência de pontos no frontend não é uma rota pedonal. Não publicar distância, duração, segurança ou acessibilidade sem medição e revisão.

O piloto deve ter uma única rota efetiva. Ela precisa de traçado, entrada, saída, travessias, superfície, riscos e procedimento de suspensão por chuva, obra ou alteração de tráfego.

### 3. QR não provar presença

O QR pode ser fotografado, compartilhado ou instalado no local errado. Ele é um mecanismo de interação, não uma prova absoluta de visita.

Usar QR aleatório e revogável, registrar contexto, limitar repetição e monitorar anomalias. Se a confiança necessária for maior, adicionar confirmação opcional de localização e revisão humana de casos suspeitos, sem coletar mais dados do que o necessário.

### 4. Dupla verdade de carimbo

O risco técnico mais grave no estado atual é o frontend declarar conquista via `localStorage`, enquanto o backend registra carimbos pelo fluxo de tag. Isso pode gerar certificados e progressos que não existem no servidor.

A mitigação é fazer o backend ser a autoridade. O frontend exibe apenas o estado retornado pelo servidor. Offline deve significar “pendente de sincronização”, nunca “carimbado definitivamente”.

### 5. Falha de operação humana

Mesmo que o software funcione, o QR pode cair, ficar ilegível, ser coberto por obra ou ser removido. O visitante não distingue falha do parceiro de falha do produto.

Cada ponto deve ter um responsável, um canal de aviso, estoque ou arquivo do QR substituto e uma rotina de vistoria. O operador deve conseguir suspender o ponto em minutos, sem nova publicação de código.

## Controles mínimos antes de abrir o piloto

Não iniciar enquanto estes controles não existirem:

1. cinco autorizações ou confirmações de responsável;
2. cinco fichas de vistoria com coordenada, foto e data;
3. uma rota com traçado e teste presencial;
4. QR cadastrado, instalado e revogável;
5. backend como fonte única do carimbo;
6. sessão persistente em outro dispositivo;
7. política curta de privacidade e consentimento;
8. canal de suporte e operador definido;
9. procedimento de suspensão de ponto e rota;
10. orçamento com reserva de 20–30%.

## Métricas para decidir após duas semanas

O piloto deve terminar com decisão, não apenas com opiniões. Medir:

- quantidade de participantes convidados e orgânicos;
- taxa de primeiro carimbo;
- taxa de segundo ponto;
- retorno em sete dias;
- conclusão da rota;
- carimbos aceitos, repetidos, falhos e suspeitos;
- QR ilegíveis ou ausentes;
- tempo médio de resposta do servidor;
- incidentes de acesso, segurança e conteúdo;
- solicitações de correção;
- custo real por participante;
- intenção de renovação do parceiro;
- valor que o comprador aceita pagar pela próxima edição.

## Critérios de decisão

**Continuar e vender a próxima edição** se houver cinco pontos funcionando, nenhum incidente crítico, retorno mensurável de usuários, dois parceiros ativos e disposição de pagamento ou renovação.

**Corrigir e repetir em escala menor** se houver interesse, mas falhas de mapa, QR, suporte ou persistência. Nesse caso, não adicionar cidades; corrigir o núcleo.

**Parar a expansão** se não houver comprador, autorização, uso repetido ou responsável local. Não responder a um problema comercial adicionando funcionalidades.

## Regra final

O piloto deve ser pequeno o suficiente para falhar sem destruir a reputação do produto e real o suficiente para produzir evidência de pagamento, uso e operação. Se não houver pessoas responsáveis no território, o +1KM continua sendo software demonstrativo, independentemente da qualidade visual do mapa.
