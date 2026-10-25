> **Atualização (25/10/2026).** Já feitos desde esta análise: recuperação de senha, Sentry/Better Stack, consentimento do GA4, cookie `SameSite=Lax`, CSP estrita, senha atual para trocar e-mail/senha, chave e rotação do link da tag, localização opcional, marcação de carimbos suspeitos, responsável/autorização/vistoria por ponto, relatório do piloto e modelos comerciais. Ainda abertos: testes de ponta a ponta, backup com restauração comprovada, prova criptográfica de presença (NTAG 424 DNA) e carimbos offline. Lista viva: `TODO.md`.

# Roadmap de evoluções necessárias — KMkm / +1 KM

**Data:** 20 de outubro de 2026  
**Versão analisada:** `KMkm-main-c81cb22.zip`  
**Escopo:** avaliação técnica, operacional, de usabilidade e preparação comercial

## 1. Objetivo

Este documento organiza as evoluções necessárias para transformar o KMkm, atualmente um protótipo avançado com frontend, API, banco MySQL, autenticação, coleção de cartas, gamificação, administração e PWA, em um produto confiável para piloto de campo e posterior comercialização.

A análise considera o código entregue no ZIP atualizado, os testes existentes, a documentação do repositório e os riscos identificados na auditoria funcional. A versão analisada passou nos testes automatizados existentes e no build do cliente, mas isso não substitui testes de integração, testes de navegador, validação em produção ou operação real em campo.

## 2. Diagnóstico resumido

### Situação atual

O projeto já possui:

- frontend mobile-first com Vite;
- API Node.js/Express;
- banco MySQL com migrações;
- cadastro, login, logout e sessão por cookie;
- caderneta de rotas;
- carimbagem por tag e QR Code;
- coleção unificada de cartas;
- eventos, patrocínios e edição numerada;
- gamificação, XP e pódio;
- painel administrativo;
- PWA com service worker;
- documentação de implantação;
- workflow de CI;
- testes automatizados para regras de cartas, XP, níveis e ranking.

### Principais lacunas

1. Não há recuperação segura de senha.
2. O acesso de usuários existentes precisa ser comprovado em aparelhos novos e após instalação PWA.
3. Faltam testes automatizados de autenticação, API e navegador.
4. A autenticidade física de um carimbo não é comprovada criptograficamente.
5. O limitador de requisições é local à memória do processo.
6. Cookie, CSRF, proxy e múltiplas origens precisam de revisão operacional.
7. O modo offline é parcial e deve ser comunicado corretamente.
8. Há documentação divergente sobre evolução temporal das cartas.
9. Backup, restauração, monitoramento e rollback ainda não estão comprovados.
10. O valor comercial ainda depende de validação com usuários e clientes reais.

## 3. Priorização

### P0 — bloquear lançamento comercial

São itens que devem ser resolvidos antes de uma operação com dados reais, prêmios ou venda para uma cidade.

- fluxo de login e acesso de conta existente;
- recuperação de senha;
- testes de cadastro, login, sessão, logout e exclusão de conta;
- backup automático e teste real de restauração;
- revisão de segurança de sessão e CSRF;
- validação da implantação publicada;
- correção da documentação contraditória;
- monitoramento mínimo e procedimento de rollback.

### P1 — corrigir antes do piloto público

- testes E2E do fluxo completo;
- mensagens e estados de erro de rede;
- validação em aparelhos Android e iOS;
- revisão de NFC, QR Code e tags físicas;
- análise de abuso e compartilhamento de códigos;
- melhoria do fluxo de coleção e progresso;
- validação de pontos e coordenadas em campo;
- revisão de privacidade e exclusão de dados.

### P2 — evoluir durante ou depois do piloto

- rate limit compartilhado com Redis ou serviço equivalente;
- tabela de projeção `cartas_usuario`;
- otimização de consultas da coleção;
- cache controlado do catálogo;
- métricas de produto e funil de uso;
- melhorias comerciais para cidades, patrocinadores e relatórios;
- acessibilidade e refinamento visual.

## 4. Frente 1 — autenticação e recuperação de conta

### 4.1 Tornar o login evidente

O código já contém tela de login e alternância entre “Criar conta” e “Entrar”. O problema a validar é a descoberta desse caminho durante a introdução visual e no PWA instalado.

#### Evoluções

- apresentar “Já tenho conta · Entrar” como ação visível na primeira abertura;
- permitir acessar o login sem percorrer o cadastro;
- preservar o e-mail quando houver erro de senha ou rede;
- testar abertura em janela anônima;
- testar após limpar dados do site;
- testar após reinstalar o PWA;
- testar em aparelho sem qualquer estado local;
- garantir que a versão publicada corresponde ao commit implantado.

#### Critério de conclusão

Uma pessoa que já possui conta deve conseguir abrir o aplicativo em outro aparelho e encontrar o acesso “Entrar” em até uma ação clara, sem depender de cadastro, cache ou dados locais.

### 4.2 Implementar recuperação de senha

A versão atual informa que não há recuperação de senha. Isso é uma lacuna crítica porque a conta guarda cartas, carimbos e progresso.

#### Fluxo recomendado

1. Usuário seleciona “Esqueci minha senha”.
2. Informa o e-mail.
3. API responde com mensagem neutra, sem revelar se a conta existe.
4. Servidor gera token aleatório de uso único.
5. Token é armazenado somente em forma hash.
6. Token expira em 15 a 30 minutos.
7. E-mail contém link HTTPS de redefinição.
8. Usuário define nova senha.
9. Token é invalidado imediatamente.
10. Sessões antigas são revogadas.

#### Requisitos de segurança

- nunca armazenar o token puro;
- impedir reutilização;
- limitar tentativas por e-mail e IP;
- não revelar contas existentes;
- registrar auditoria sem armazenar senha ou token;
- invalidar sessões após alteração de senha;
- manter política de retenção dos registros.

#### Critério de conclusão

O fluxo deve ser testado com e-mail válido, token expirado, token reutilizado, token inválido, várias solicitações e sessão antiga ainda aberta.

## 5. Frente 2 — segurança de sessão e API

### 5.1 Revisar cookies e origem

A aplicação utiliza cookie HttpOnly e Secure em HTTPS. O modo HTTPS usa `SameSite=None`, que precisa ser justificado pela arquitetura de domínios.

#### Evoluções

- confirmar se cliente e API usam o mesmo site;
- usar `SameSite=Lax` quando não houver necessidade de contexto cross-site;
- revisar `Secure`, domínio, caminho e expiração;
- validar `Origin` e `Referer` em requisições mutáveis;
- adotar token CSRF se houver necessidade de cross-site;
- testar atrás do proxy do EasyPanel;
- garantir que logout invalida a sessão no servidor;
- definir expiração absoluta e expiração por inatividade.

### 5.2 Rate limit

O limitador atual usa memória do processo. Isso é aceitável como proteção inicial em uma única instância, mas não escala para múltiplas réplicas.

#### Evoluções

- manter limites específicos para login, criação de conta, carimbo, recuperação e administração;
- registrar bloqueios e picos de tentativa;
- migrar buckets para Redis quando houver múltiplas instâncias;
- combinar IP, conta e identificadores de operação;
- evitar bloqueio excessivo de usuários legítimos em redes compartilhadas.

### 5.3 Validação de entradas

Aplicar normalização e validação consistente no servidor:

- códigos de tags sem espaços acidentais;
- códigos tratados sem diferença indevida entre maiúsculas e minúsculas;
- e-mails normalizados;
- limites de tamanho em campos administrativos;
- mensagens técnicas separadas das mensagens exibidas ao usuário;
- nenhum progresso aceito diretamente do cliente.

## 6. Frente 3 — testes automatizados

Os testes existentes validam principalmente regras de gamificação. É necessário acrescentar cobertura de aplicação.

### 6.1 Testes de API

Criar uma suíte de integração para:

- criar conta;
- rejeitar e-mail inválido;
- rejeitar senha curta;
- impedir cadastro duplicado;
- entrar com credenciais corretas;
- rejeitar senha incorreta;
- consultar sessão;
- sair;
- rejeitar sessão expirada;
- excluir conta;
- consultar caderneta;
- carimbar uma tag publicada;
- rejeitar tag inexistente;
- impedir carimbo fora de janela de evento;
- evitar emissão duplicada;
- verificar carta desbloqueada;
- verificar permissões administrativas.

### 6.2 Testes de concorrência

Testar duas solicitações simultâneas para:

- o mesmo usuário e a mesma tag;
- o mesmo evento;
- emissão numerada;
- primeira conquista de carta;
- criação de conta ou sessão.

### 6.3 Testes E2E

O fluxo mínimo deve ser:

1. abrir o aplicativo sem dados locais;
2. acessar “Entrar”;
3. criar uma conta de teste;
4. sair;
5. entrar novamente;
6. abrir a coleção;
7. carimbar uma tag de teste;
8. confirmar a carta desbloqueada;
9. atualizar a página;
10. verificar que a carta continua na coleção;
11. testar falha de rede;
12. testar sessão expirada.

### Critério de conclusão

A CI deve executar pelo menos testes de servidor e build a cada alteração. O fluxo crítico de navegador deve rodar em ambiente controlado antes de cada publicação.

## 7. Frente 4 — coleção e desempenho

### 7.1 Manter a separação entre histórico e coleção

A decisão recomendada é:

- `carimbos`: histórico de visitas e eventos;
- coleção: cartas conquistadas pelo usuário;
- carta: desbloqueada no primeiro carimbo de rota do ponto;
- visitas posteriores: histórico, XP ou outras regras explicitamente definidas.

Não reintroduzir evolução temporal se a regra oficial continuar sendo de cartas únicas.

### 7.2 Tabela de projeção da coleção

Quando o volume justificar, criar uma tabela como:

```sql
CREATE TABLE cartas_usuario (
  usuario_id INT NOT NULL,
  tag_id INT NOT NULL,
  primeiro_carimbo_id BIGINT NOT NULL,
  desbloqueada_em TIMESTAMP NOT NULL,
  PRIMARY KEY (usuario_id, tag_id)
);
```

Ela deve ser preenchida na mesma transação do primeiro carimbo de rota.

### Benefícios

- elimina agregações repetidas em `carimbos`;
- facilita contagem de cartas conquistadas;
- reduz o custo da caderneta;
- torna a unicidade da carta explícita;
- permite atualizar a coleção sem reler todo o histórico.

### 7.3 Índices a avaliar

Antes de criar índices em produção, comparar planos com `EXPLAIN ANALYZE`. Candidatos:

```sql
CREATE INDEX idx_carimbos_usuario_evento_tag_data
  ON carimbos (usuario_id, evento_id, tag_id, criado_em);

CREATE INDEX idx_carimbos_usuario_evento_tag_id
  ON carimbos (usuario_id, evento_id, tag_id, id);

CREATE INDEX idx_tags_rota_status_ordem
  ON tags (rota_id, status, ordem);

CREATE INDEX idx_evento_tags_tag_evento
  ON evento_tags (tag_id, evento_id);
```

Não adicionar todos automaticamente. Índices aumentam o custo de escrita e devem ser validados com volume real.

## 8. Frente 5 — experiência do usuário e usabilidade

### 8.1 Fluxo principal

A ação mais importante deve ser evidente:

```text
Encontrar ponto → confirmar visita → desbloquear carta → escolher próximo ponto
```

A interface deve evitar apresentar carimbo técnico, carta, evento e certificado como ações equivalentes.

### 8.2 Melhorias recomendadas

- CTA principal com área de toque de pelo menos 44 px;
- acesso ao login visível;
- feedback imediato ao iniciar uma operação;
- skeleton ou estado de carregamento;
- mensagem específica para erro de rede;
- destaque único para carta recém-desbloqueada;
- progresso geral e progresso por rota;
- indicação de quantas cartas faltam;
- filtros simples na coleção;
- estados vazios com próximo passo claro;
- comunicação explícita quando o aplicativo estiver offline;
- navegação consistente entre mapa, coleção e rota.

### 8.3 Linguagem

Usar linguagem orientada ao usuário:

- “Carta desbloqueada”;
- “Você já conquistou esta carta”;
- “Não foi possível confirmar a visita”;
- “Tente novamente quando estiver conectado”.

Manter códigos técnicos apenas na API, logs ou suporte.

## 9. Frente 6 — carimbo físico e antifraude

O código atual de uma tag pode ser compartilhado. Portanto, ele comprova apresentação do código, mas não prova sozinho presença física.

### Para piloto sem recompensa financeira

- códigos longos e imprevisíveis;
- revogação de tags;
- rate limit;
- detecção de sequências impossíveis;
- análise de muitos carimbos em pouco tempo;
- painel de auditoria;
- possibilidade de correção manual.

### Para prêmios ou benefícios

- NFC com mecanismo mais resistente a cópia;
- desafio ou token temporário;
- validação de localização aproximada com consentimento;
- janela temporal coerente;
- revisão manual de casos suspeitos;
- regras públicas de elegibilidade;
- registro de auditoria.

Não anunciar o carimbo atual como prova criptográfica de presença.

## 10. Frente 7 — PWA, offline e aparelhos reais

### Limite atual

O service worker armazena o shell e recursos estáticos, mas não deve ser considerado sincronização offline completa. Login, carimbagem, confirmação de carta e atualização da coleção dependem de conexão.

### Evoluções

- mostrar estado online/offline;
- informar quando a coleção exibida pode estar desatualizada;
- não confirmar uma carta sem resposta do servidor;
- tratar falha de rede sem apagar estado local útil;
- testar atualização de service worker;
- testar instalação, atualização e reinstalação;
- testar Android Chrome, iOS Safari e navegador desktop;
- validar NFC em aparelhos compatíveis;
- manter QR Code como alternativa de acesso.

## 11. Frente 8 — documentação e governança técnica

### Correções imediatas

- remover do checklist qualquer referência a evolução nos dias 5, 30 e 45 se essa regra foi descontinuada;
- revisar arquivos de versões antigas para deixar claro que são históricos;
- atualizar README, checklist e documentação de cartas para a mesma regra;
- documentar claramente o fluxo de recuperação de conta quando implementado;
- registrar o commit efetivamente implantado;
- manter procedimento de rollback;
- documentar variáveis obrigatórias do EasyPanel;
- registrar como executar migrações com segurança.

### Regra oficial sugerida

> Cada ponto publicado corresponde a uma carta única. O primeiro carimbo de rota desbloqueia a carta definitivamente. Visitas posteriores não evoluem a carta; podem participar de histórico, XP ou regras específicas documentadas separadamente.

## 12. Frente 9 — operação e infraestrutura

### Backup

Implantar:

- backup automático do MySQL;
- retenção definida;
- cópia fora do servidor principal;
- criptografia;
- teste periódico de restauração;
- registro da data do último backup válido.

Um backup só deve ser considerado confiável depois de uma restauração testada.

### Monitoramento

Monitorar pelo menos:

- disponibilidade da API;
- tempo de resposta por endpoint;
- erros 4xx e 5xx;
- falhas de login;
- falhas de carimbagem;
- uso de CPU e memória;
- espaço em disco;
- conexões do MySQL;
- falhas de migração;
- volume anormal de carimbos.

### Implantação

Definir:

1. backup antes da migração;
2. implantação em ambiente de teste;
3. execução das migrações;
4. smoke test;
5. validação de login;
6. validação de carimbagem;
7. observação de erros;
8. rollback documentado.

## 13. Frente 10 — privacidade e conformidade operacional

Antes de um piloto público, revisar:

- finalidade da coleta de e-mail e nome;
- retenção de carimbos;
- uso de localização aproximada;
- consentimento para recursos de localização;
- exclusão de conta;
- exclusão ou anonimização de registros relacionados;
- política de privacidade coerente com o comportamento real;
- contato responsável pelo tratamento de dados;
- acesso administrativo e trilha de auditoria.

O projeto deve evitar afirmar na política que existe uma proteção ou comunicação que ainda não foi implementada.

## 14. Plano de execução sugerido

### Fase 1 — confiabilidade da conta

**Objetivo:** garantir acesso e recuperação dos dados.

- revisar tela inicial e login;
- validar implantação do commit atual;
- implementar recuperação de senha;
- revisar sessão, cookie e CSRF;
- corrigir mensagens de senha;
- criar testes de autenticação;
- testar aparelho novo e PWA reinstalado.

### Fase 2 — qualidade do fluxo principal

**Objetivo:** garantir que a jornada de visita funcione de ponta a ponta.

- criar testes E2E;
- testar carimbo, carta e coleção;
- testar repetição e falha de rede;
- revisar mensagens de erro;
- validar NFC e QR Code;
- validar tags reais e coordenadas.

### Fase 3 — operação segura

**Objetivo:** permitir piloto com risco controlado.

- automatizar backup;
- realizar restauração de prova;
- configurar monitoramento;
- documentar implantação e rollback;
- revisar privacidade;
- corrigir documentação divergente;
- criar procedimento de suporte.

### Fase 4 — desempenho e escala

**Objetivo:** preparar crescimento sem reescrever a aplicação.

- medir consultas com `EXPLAIN ANALYZE`;
- adicionar somente índices comprovadamente úteis;
- criar `cartas_usuario`;
- reduzir carregamento duplicado da coleção;
- separar endpoints pesados;
- migrar rate limit para armazenamento compartilhado quando necessário.

### Fase 5 — validação comercial

**Objetivo:** transformar software em oferta comprovada.

- executar piloto em Eunápolis;
- medir usuários cadastrados;
- medir usuários ativos;
- medir pontos visitados;
- medir cartas conquistadas;
- medir retorno ao aplicativo;
- testar interesse de patrocinadores;
- documentar resultados;
- construir primeiro caso de sucesso.

## 15. Critérios para considerar o produto pronto para piloto

O KMkm poderá ser considerado pronto para um piloto controlado quando:

- login e cadastro funcionarem em aparelho sem estado anterior;
- recuperação de senha estiver implementada ou houver processo operacional seguro documentado;
- testes de API e E2E cobrirem o fluxo principal;
- backup e restauração tiverem sido comprovados;
- monitoramento mínimo estiver ativo;
- implantação e rollback estiverem documentados;
- documentação não tiver regras conflitantes;
- tags e pontos tiverem sido verificados em campo;
- mensagens de erro forem compreensíveis;
- privacidade e exclusão de conta estiverem coerentes;
- carimbos com benefício tiverem regras antifraude adequadas.

## 16. Critérios para considerar o produto pronto para venda recorrente

Além dos requisitos do piloto:

- operação estável por período observado;
- suporte definido;
- relatório para cidade ou patrocinador;
- custos de infraestrutura conhecidos;
- rotina de atualização e backup;
- SLA ou expectativa de disponibilidade definida;
- gestão de usuários e administradores documentada;
- processo de implantação reproduzível;
- modelo de preço testado;
- evidência de uso e valor para o cliente.

## 17. Estimativa de esforço

As faixas abaixo são referências de planejamento, não propostas comerciais.

| Frente | Esforço relativo | Prioridade |
|---|---:|---|
| Login, sessão e recuperação | Médio | P0 |
| Testes de API e E2E | Médio/alto | P0/P1 |
| Backup, restauração e monitoramento | Médio | P0 |
| Revisão de segurança | Médio | P0/P1 |
| Documentação e implantação | Baixo/médio | P0 |
| Validação de tags e operação de campo | Médio | P1 |
| Otimização de coleção e banco | Médio | P2 |
| Rate limit compartilhado | Médio | P2 |
| Métricas de produto e relatórios | Médio | P2 |

Uma estimativa financeira só deve ser fechada depois de transformar estas frentes em tarefas técnicas com escopo e critérios de aceite.

## 18. Recomendação final

O KMkm não precisa ser reescrito. A base existente é suficientemente ampla para sustentar um piloto, mas o próximo investimento deve ser em confiabilidade e comprovação, não em quantidade de funcionalidades.

A ordem recomendada é:

1. garantir acesso e recuperação da conta;
2. testar o fluxo principal em navegador e aparelhos reais;
3. proteger sessão, dados e carimbagem;
4. automatizar backup, monitoramento e rollback;
5. alinhar documentação e regra de cartas;
6. validar a operação em campo;
7. medir o piloto;
8. somente então ampliar recursos e vender implantação para outras cidades.

A principal evolução necessária é passar de “muitas funcionalidades implementadas” para “fluxos críticos comprovadamente confiáveis”. Essa mudança aumenta mais o valor técnico e comercial do projeto do que adicionar novas telas isoladas.
