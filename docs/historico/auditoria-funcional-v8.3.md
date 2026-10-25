> **Documento histórico.** Descreve uma versão anterior do projeto e **não** reflete o estado atual. Para o estado de hoje: [README](../../README.md), [CHANGELOG](../../CHANGELOG.md) e [índice](../INDEX.md).

# Auditoria funcional e operacional — +1 KM / Caderneta v8.3

Data: 2026-10-13

## Resultado

O projeto é um protótipo funcional com API Express, MySQL, contas, carimbos persistidos no servidor, PWA e fluxo de eventos. **Ainda não está pronto para lançamento público**: a própria configuração mantém os oito pontos como `pendente`, não há painel administrativo, os códigos não têm ciclo operacional completo de emissão/rotação/revogação, e a validação de campo/comercial não está concluída.

## Correções aplicadas nesta revisão

1. **Novas cadernetas não começam com carimbos fictícios.** Antes, o estado inicial já marcava EU-001, EU-002 e EU-003 como conquistados e preenchia o histórico com datas artificiais. Isso podia gerar progresso/certificados aparentes sem visita nem confirmação do servidor. Agora `conquered` e `history` começam vazios.
2. **O service worker não armazena respostas de `/api/`.** Antes, qualquer GET da API podia entrar no cache PWA, inclusive dados de caderneta/sessão. Isso podia mostrar dados antigos após logout, troca de conta ou uso offline. Agora chamadas da API passam direto pela rede; apenas o shell/recursos estáticos usam cache.
3. **Cache PWA renovado** para que os dispositivos recebam a correção do service worker.

## Falhas e pendências prioritárias

### P0 — antes de qualquer piloto com público

- Publicar somente pontos vistoriados. O seed cria oito tags como `pendente`; o endpoint de carimbo corretamente rejeita com HTTP 409. Não publicar por comando até haver ficha de campo, coordenada/endereço confirmados, autorização, responsável e segurança/acessibilidade avaliadas.
- Fazer teste integrado em ambiente de produção com MySQL real: criar conta, entrar, carimbar tag publicada, repetir toque, abrir caderneta em outro dispositivo, excluir conta e confirmar que o dado desapareceu.
- Definir hospedagem real para API + MySQL persistente, TLS, backup automático e teste de restauração. GitHub Pages sozinho não executa Express nem MySQL; o frontend publicado isoladamente não constitui o sistema de carimbagem completo.
- Criar cópia de segurança antes de aplicar migrações a um banco existente; validar as migrações com a mesma versão de MySQL/MariaDB usada na produção.
- Resolver política de sessão e privacidade: prazo/expiração, logout em todos os dispositivos quando necessário, política de retenção, exclusão verificável e texto de consentimento/LGPD.
- Operação de contingência: contato de suporte, quem pode suspender um ponto, como substituir etiqueta danificada e como comunicar indisponibilidade. Sem confirmação do servidor, a interface não deve dizer “carimbado”.

### P1 — para uma operação minimamente administrável

- Não existe painel/role de administrador. Publicação de pontos e gestão de eventos dependem de acesso ao servidor/banco e scripts manuais. Criar administração autenticada com papéis, trilha de auditoria e confirmação para publicar/despublicar.
- Não há fluxo completo de geração, impressão, inventário e revogação de tags/QR. Um código curto/estático pode ser fotografado e compartilhado; definir código aleatório, revogação, substituição e monitoramento de uso anômalo.
- Adicionar testes automatizados de regras de carimbo: tag inexistente/pendente, toque repetido, concorrência de dois pedidos, card ativo/inativo, formação de turma, conclusão de rota e exclusão de conta.
- Rate limiting está em memória por processo: reinicia junto com o servidor e não coordena múltiplas instâncias. Para escala, usar limitador compartilhado e limites por conta além do IP.
- Rever tratamento de erro e observabilidade: logs estruturados sem dados pessoais desnecessários, alertas para erros 5xx/DB, monitoramento de disponibilidade e tempo de resposta.
- Implementar procedimento de recuperação de senha e verificação de e-mail, ou declarar explicitamente que o piloto é fechado e como recuperar acesso.

### P2 — depois de provar o núcleo

- Instrumentar métricas de funil: acessos, primeiro carimbo confirmado, segundo ponto, retorno em 7 dias, conclusão, falhas por ponto, custo por participante e renovação do parceiro.
- Testar acessibilidade, aparelhos Android de entrada, NFC/QR, baixa conectividade, consumo de dados e instalação PWA.
- Rever cópias e textos que chamam a experiência de “NFC”: o fluxo atual é uma página web aberta pelo código/URL da tag. É preciso confirmar se o suporte NFC real será NDEF com URL, QR impresso, ou ambos; testar os aparelhos e tags comprados.
- Validar licenças/atribuição e limites dos serviços de mapa, política de cache e plano de contingência para tiles.

## Observações técnicas

- A API tem `/api/saude`, mas esse endpoint sozinho não comprova que banco, migrações, login e carimbo estão operacionais.
- O service worker foi corrigido para não cachear `/api/`; os dados de caderneta dependem de rede. A interface deve tratar essa indisponibilidade como erro/estado offline, não como carimbo confirmado.
- A chave local antiga pode conter progresso demonstrativo de instalações anteriores. A correção do estado inicial afeta novas cadernetas; não apagamos automaticamente estados já salvos para evitar perda de dados de usuários existentes. Antes de um piloto controlado, limpar os dispositivos de teste ou validar seus dados com o servidor.
- A implementação usa endpoint web de carimbo. Não há evidência no código de leitura de UID NFC nem de prova criptográfica de proximidade; NFC/QR é o meio de abrir a URL, não prova antifraude de presença.

## Critério mínimo de “pronto para piloto”

1. Hospedagem HTTPS e banco persistente com backup/restauração testados.
2. Pelo menos 5 pontos autorizados e vistoriados, publicados só após checklist assinado.
3. Etiquetas instaladas e testadas em mais de um modelo de celular; código revogável/substituível.
4. Teste ponta a ponta de conta, carimbo, repetição, sincronização em segundo dispositivo e exclusão aprovado.
5. Teste de rede ruim e erro de servidor aprovado sem falso “Carimbado!”.
6. Política de privacidade/consentimento, suporte, operador responsável e plano de suspensão definidos.
7. Um parceiro/comprador confirma por escrito escopo, prazo, responsabilidades e orçamento do piloto.

**Conclusão:** não expandir funcionalidades ainda. Primeiro estabilizar o caminho crítico — conta → abrir tag → validação no servidor → persistência → caderneta sincronizada — e provar a operação física em cinco pontos.
