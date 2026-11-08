# Prompt mestre para evolução completa do projeto KMkm com Capacitor

Atue como engenheiro de software sênior, arquiteto de sistemas, especialista em UX/UI, segurança, qualidade, aplicações web progressivas e aplicativos Android com Capacitor.

Trabalhe diretamente no repositório **KMkm**. Analise o projeto como um produto completo, não apenas como um conjunto de arquivos ou como um sistema de autenticação. Sua missão é corrigir, implementar, completar, modernizar e validar toda a aplicação, incluindo telas, páginas, navegação, experiência do usuário, regras de negócio, API, banco de dados, PWA, aplicativo Android Capacitor, integrações, testes, documentação e preparação para produção comercial na Google Play.

Não se limite a apontar problemas. Inspecione o código existente, tome decisões técnicas justificadas, altere os arquivos necessários, crie funções, componentes, páginas, migrations, testes e soluções que estejam faltando.

## Diretriz tecnológica obrigatória

A arquitetura mobile deste projeto é **Capacitor Android sobre o PWA existente**.

- Não migrar o projeto para Flutter.
- Não criar uma segunda implementação mobile independente sem justificativa técnica aprovada.
- Reutilizar o frontend web existente dentro do Capacitor sempre que possível.
- Manter o PWA funcional no navegador e instalável na web.
- Implementar funcionalidades nativas por meio de plugins Capacitor ou código Android nativo somente quando necessário.
- Preservar a compatibilidade entre navegador, PWA instalado e aplicativo Android Capacitor.
- Usar o projeto Android existente em `client/android`.
- Usar o bundle web produzido em `client/dist` e sincronizado por `npx cap sync android`.
- Não substituir o backend ou o contrato da API sem necessidade.

Quando uma solução for diferente no navegador e no Android, implementar uma camada de capacidade com detecção explícita de plataforma. Nunca presumir que uma API web ou plugin nativo esteja disponível em todos os ambientes.

## Objetivo geral

Transformar o KMkm em um produto funcional, consistente, seguro, intuitivo, testável, visualmente coerente e preparado para evolução contínua, com:

- PWA web completo;
- aplicativo Android Capacitor distribuível pela Google Play;
- experiência consistente entre navegador, PWA instalado e Android;
- GPS e NFC confiáveis para confirmação de carimbos;
- API e banco de dados íntegros;
- segurança, observabilidade e documentação suficientes para operação comercial.

Analise e melhore todas as áreas do projeto:

- páginas públicas;
- telas de entrada e autenticação;
- cadastro e perfil;
- navegação;
- home;
- mapa;
- pontos turísticos;
- rotas;
- carimbos;
- caderneta;
- coleção;
- certificados;
- eventos;
- campanhas;
- gamificação;
- ranking;
- pódio;
- painel administrativo;
- gerenciamento de conteúdo;
- mídia e imagens;
- experiência PWA;
- experiência Android Capacitor;
- acessibilidade;
- responsividade;
- API;
- banco de dados;
- sessões e permissões;
- integrações externas;
- observabilidade;
- desempenho;
- testes;
- documentação;
- publicação e configuração de produção.

## 1. Inspeção completa do projeto

Antes de alterar o código:

1. Identifique a estrutura do repositório.
2. Determine as tecnologias utilizadas no servidor, cliente web/PWA, Android Capacitor, banco e infraestrutura.
3. Localize todos os pontos de entrada da aplicação.
4. Mapeie páginas, telas, rotas, componentes, layouts, menus, navegação, modais, formulários, APIs, modelos, tabelas, migrations, integrações, arquivos estáticos, configurações e testes.
5. Verifique dependências, scripts, variáveis de ambiente e comandos de build.
6. Leia a documentação existente e compare-a com o comportamento real do sistema.
7. Inspecione `client/package.json`, `client/capacitor.config.json`, `client/android`, workflows do GitHub Actions e arquivos de ambiente Android.
8. Identifique funcionalidades duplicadas, abandonadas, incompletas ou contraditórias.

Classifique os achados em:

- funcional;
- parcialmente funcional;
- quebrado;
- ausente;
- inconsistente;
- risco de segurança;
- problema de UX;
- problema de acessibilidade;
- problema de desempenho;
- dívida técnica;
- dependência de configuração externa;
- risco específico do Android/Capacitor;
- risco específico da Google Play.

Não presuma que uma funcionalidade está pronta apenas porque existe uma tela, uma rota, um botão ou um plugin. Valide o fluxo completo no navegador e no Android sempre que aplicável.

## 2. Auditoria de telas e páginas

Analise cada tela e página individualmente.

Para cada uma, verifique:

- objetivo da tela;
- clareza da informação;
- hierarquia visual;
- consistência com a identidade do KMkm;
- navegação de entrada e saída;
- estados de carregamento;
- estado vazio;
- estado de erro;
- estado de sucesso;
- comportamento offline ou sem conexão;
- responsividade;
- funcionamento em telas pequenas;
- acessibilidade;
- textos e mensagens;
- botões sem ação;
- links quebrados;
- formulários incompletos;
- dados estáticos onde deveriam existir dados reais;
- informações que deveriam ser ocultadas ou protegidas;
- problemas de performance;
- possibilidade de reutilização de componentes.

Corrija telas visualmente inconsistentes, incompletas ou confusas. Crie componentes reutilizáveis quando isso reduzir duplicação e melhorar a manutenção.

Não faça apenas mudanças cosméticas. Toda alteração visual deve melhorar clareza, usabilidade, acessibilidade ou consistência do produto.

## 3. Páginas públicas e experiência de descoberta

Verifique e complete, quando existirem:

- página inicial;
- apresentação do projeto;
- catálogo de pontos;
- detalhes de cada ponto;
- mapas;
- rotas;
- eventos;
- parceiros;
- campanhas;
- políticas;
- privacidade;
- termos;
- páginas de erro;
- páginas de compartilhamento;
- páginas abertas por QR Code, NFC e App Links.

Garanta que as páginas tenham conteúdo real, funcionem sem autenticação quando essa for a regra, exibam informações corretas, não exponham dados privados, possuam títulos e metadados adequados, tenham links consistentes, possam ser compartilhadas, sejam acessíveis por teclado e leitores de tela e funcionem corretamente em dispositivos móveis.

## 4. Autenticação, contas e perfis

Audite e complete:

- criação de conta;
- validação de nome, e-mail e senha;
- login;
- logout;
- restauração de sessão;
- expiração de sessão;
- atualização de nome;
- atualização de e-mail;
- alteração de senha;
- recuperação de senha;
- redefinição por token;
- confirmação de nova senha;
- tokens expirados e de uso único;
- revogação de sessões;
- mensagens de erro;
- estados de carregamento;
- compatibilidade entre PWA, navegador e Capacitor.

Use hash seguro com salt, cookies protegidos, proteção CSRF, rate limiting, mensagens que evitem enumeração de contas e armazenamento seguro de tokens. No Android, não armazene segredos em texto puro nem dependa de valores hardcoded no bundle.

## 5. Regras de negócio e dados

Analise se as regras de negócio estão realmente implementadas e são consistentes.

Verifique:

- pontos;
- categorias;
- rotas;
- carimbos;
- localização;
- distância;
- validação geográfica;
- precisão do GPS;
- progresso;
- caderneta;
- coleção;
- certificados;
- XP;
- níveis;
- ranking;
- eventos;
- campanhas;
- tiragens;
- numeração;
- parceiros;
- permissões;
- status de publicação;
- conteúdo oculto ou privado.

Valide se os dados exibidos na interface correspondem aos dados armazenados e retornados pela API.

Corrija regras duplicadas, cálculos divergentes, IDs inconsistentes, estados impossíveis, registros duplicados, ausência de constraints, falhas de integridade, migrations incompletas e respostas incompatíveis entre endpoints.

Quando necessário, crie migrations, índices, constraints, modelos, consultas e funções de domínio.

## 6. API e servidor

Audite todos os endpoints e garanta:

- validação de entrada;
- respostas consistentes;
- códigos HTTP corretos;
- autenticação;
- autorização;
- proteção contra abuso;
- tratamento de erros;
- logs seguros;
- paginação quando necessária;
- limites de payload;
- transações;
- concorrência;
- idempotência;
- consistência entre documentação e implementação.

Não deixe endpoints parcialmente implementados ou rotas que retornem dados fictícios. Atualize contratos, schemas e documentação da API quando houver alterações.

Para carimbos com geolocalização:

- validar latitude, longitude e precisão no servidor;
- nunca confiar somente na validação do cliente;
- manter o limite de raio no servidor;
- tratar GPS ausente, impreciso, desativado e fora do raio;
- não armazenar coordenadas além do necessário para a regra de negócio;
- retornar códigos de erro estáveis para a interface web e Android;
- preservar idempotência para evitar carimbos duplicados.

## 7. PWA e cliente web

Audite:

- manifest web;
- service worker;
- cache;
- atualização de assets;
- instalação;
- comportamento standalone;
- links compartilháveis;
- QR Code;
- NFC via APIs web quando disponíveis;
- geolocalização via navegador;
- câmera e mídia;
- funcionamento offline;
- fallback quando uma API não existir;
- compatibilidade com Chrome, Edge, Safari e navegadores Android relevantes.

Use detecção de capacidade e melhoria progressiva. O PWA deve continuar utilizável mesmo quando uma API nativa não estiver disponível.

## 8. Aplicativo Android Capacitor

Audite o aplicativo em `client/android` e a integração com o frontend:

- `capacitor.config.json`;
- `appId` e nome do aplicativo;
- versão e `versionCode`;
- `compileSdkVersion`;
- `targetSdkVersion`;
- `minSdkVersion`;
- AndroidManifest;
- permissões runtime;
- permissões declaradas;
- plugins Capacitor;
- sincronização de assets;
- bridge JavaScript/Android;
- ciclo de vida do aplicativo;
- links HTTPS e App Links;
- links NFC;
- GPS;
- câmera;
- compartilhamento;
- armazenamento local;
- cookies e sessão;
- abertura externa de links;
- tratamento de rede;
- tela de carregamento;
- ícone;
- splash screen;
- back button;
- orientação e mudanças de configuração;
- comportamento após retomada do app;
- acessibilidade Android;
- segurança do WebView e do tráfego.

### GPS e permissões

Para o fluxo de carimbo:

- declarar `ACCESS_COARSE_LOCATION` e `ACCESS_FINE_LOCATION` quando a precisão precisa for usada;
- solicitar a permissão no momento adequado, explicando o motivo ao usuário;
- verificar se o serviço de localização do aparelho está ativado;
- tratar permissão negada, permissão aproximada, timeout e sinal insuficiente;
- exibir mensagem específica para cada falha;
- permitir nova tentativa sem duplicar requisições;
- validar a posição no servidor;
- testar em área aberta e em ambiente urbano;
- não considerar a obtenção da coordenada como confirmação do carimbo: somente a resposta positiva da API confirma a visita.

### NFC e links

Verifique o comportamento de:

- leitura de URI NFC;
- leitura de QR Code;
- App Links Android;
- domínio HTTPS;
- `assetlinks.json`;
- abertura de rotas específicas dentro do app;
- fallback para navegador;
- links com chave de acesso;
- prevenção de exposição de tokens e chaves.

Não implemente funcionalidades Flutter. Use APIs web, plugins Capacitor ou código nativo Android somente quando necessário e documente a decisão.

## 9. Design, UX e acessibilidade

Mantenha linguagem visual coerente em todo o produto.

Revise cores, tipografia, espaçamentos, bordas, ícones, botões, formulários, cartões, cabeçalhos, links, navegação inferior, menus, feedback visual, mensagens, contraste, foco, tamanhos de toque e leitura por tecnologias assistivas.

Use HTML semântico, labels corretos, mensagens associadas aos campos, foco visível e navegação por teclado.

No Android Capacitor, verifique também:

- escala de fonte;
- áreas de toque;
- contraste em tema claro e escuro;
- foco e TalkBack;
- barra de status;
- botão voltar;
- rotação e tamanhos de tela;
- mensagens de permissão;
- comportamento quando o teclado aparece.

Não substitua funcionalidade por animações. Use animações somente quando contribuírem para entendimento, feedback ou orientação.

## 10. Segurança

Considere segurança em todo o sistema:

- senhas nunca em texto puro;
- tokens criptograficamente imprevisíveis;
- tokens armazenados somente em formato hash quando aplicável;
- expiração e uso único;
- sessões revogáveis;
- cookies HttpOnly, Secure e SameSite;
- CSRF;
- rate limiting;
- proteção contra enumeração;
- autorização por recurso;
- prevenção de SQL injection;
- prevenção de XSS;
- CSP;
- sanitização de HTML;
- proteção de uploads;
- remoção de EXIF quando necessário;
- não exposição de segredos;
- logs sem dados sensíveis;
- erros sem vazamento de informações internas;
- limites de tamanho e frequência;
- proteção de rotas administrativas;
- validação de certificados e HTTPS;
- configuração segura do WebView;
- ausência de credenciais no APK;
- revisão de permissões Android para solicitar somente o necessário.

## 11. Desempenho e confiabilidade

Verifique tamanho dos bundles, carregamento inicial, imagens, lazy loading, cache, consultas lentas, N+1 queries, chamadas duplicadas, re-renderizações, uso de memória, timeouts, retry, falhas de rede, filas, jobs, observabilidade e rastreamento de erros.

No Capacitor, verifique também:

- tempo de inicialização;
- tamanho do APK/AAB;
- custo de sincronização de assets;
- consumo de bateria pelo GPS;
- comportamento com rede lenta;
- retomada após suspensão;
- perda de conectividade durante o carimbo;
- compatibilidade entre versão do app e versão da API.

Implemente melhorias com justificativa técnica e sem criar complexidade desnecessária.

## 12. Testes

Crie ou atualize:

- testes unitários;
- testes de componentes;
- testes de telas;
- testes de contrato;
- testes de API;
- testes de banco;
- testes de integração;
- testes de PWA;
- testes de integração Capacitor;
- testes E2E, quando o ambiente permitir;
- testes de manifesto e permissões Android;
- testes de build Android.

Cubra principalmente:

- fluxos felizes;
- entradas inválidas;
- estados vazios;
- estados de erro;
- falhas de rede;
- permissões;
- sessão;
- GPS preciso e aproximado;
- GPS desativado;
- timeout de localização;
- fora do raio;
- ponto sem coordenadas;
- carimbo duplicado;
- NFC;
- App Links;
- regras de negócio;
- segurança;
- responsividade;
- compatibilidade web/Android.

Não remova testes apenas para conseguir uma suíte verde.

## 13. Publicação comercial na Google Play

Prepare o aplicativo para publicação real, não apenas para APK debug.

Verifique e implemente:

- AAB de release;
- assinatura de release;
- upload keystore protegido e fora do Git;
- Play App Signing;
- `applicationId` definitivo;
- `versionCode` crescente;
- `versionName` coerente;
- `targetSdkVersion` compatível com o requisito vigente da Google Play;
- ícone adaptativo;
- splash screen;
- screenshots;
- descrição da loja;
- classificação etária;
- formulário de segurança de dados;
- política de privacidade pública;
- declaração de permissões de localização e NFC;
- credenciais de revisão, se o app exigir login;
- canal de suporte;
- monitoramento de falhas;
- teste interno;
- teste fechado;
- produção gradual.

Não use APK debug como entrega comercial. O workflow de CI deve gerar e guardar o AAB de release somente quando a assinatura estiver configurada com segurança.

Se a conta do Play Console for uma conta pessoal criada depois de 13 de novembro de 2023, considere o requisito de teste fechado com pelo menos 12 testadores inscritos durante 14 dias consecutivos antes de solicitar acesso à produção.

## 14. Processo de implementação

Trabalhe por prioridade:

1. erros que impedem execução;
2. falhas de segurança;
3. falhas de GPS, NFC, App Links e carimbos;
4. fluxos principais quebrados;
5. dados incorretos;
6. páginas e telas incompletas;
7. problemas de UX e acessibilidade;
8. desempenho;
9. build e publicação Android;
10. melhorias estruturais;
11. refinamentos visuais.

Para cada alteração:

- explique a causa;
- implemente a correção;
- crie ou atualize o teste correspondente;
- execute a validação;
- confirme que não quebrou outra área;
- registre limitações e dependências externas.

Preserve decisões arquiteturais válidas. Não reescreva o sistema inteiro sem necessidade. Não use soluções falsas, dados simulados fora de testes ou atalhos que escondam problemas.

## 15. Validação obrigatória

Execute todos os comandos disponíveis para:

- testes do servidor;
- testes do cliente;
- build web/PWA;
- sincronização Capacitor;
- build Android debug;
- build Android release/AAB, quando as credenciais permitirem;
- análise estática;
- validação de sintaxe;
- validação de JSON, YAML e XML;
- validação de migrations;
- verificação de dependências;
- verificação de formatação;
- `git diff --check`.

Valide também:

- permissões no APK/AAB final;
- `targetSdkVersion`;
- `applicationId`;
- presença dos assets web;
- presença dos plugins Capacitor;
- App Links;
- `assetlinks.json`;
- workflow do GitHub Actions;
- artefatos publicados.

Se algo não puder ser executado, informe:

- comando;
- motivo;
- se o problema é do ambiente ou do código;
- impacto da limitação;
- como executar posteriormente.

Não declare sucesso sem evidência.

## 16. Entrega final

Ao terminar, apresente um relatório objetivo contendo:

- visão geral do estado inicial;
- problemas encontrados;
- funcionalidades corrigidas;
- funcionalidades implementadas;
- telas e páginas modificadas;
- arquivos criados;
- arquivos alterados;
- banco de dados e migrations modificados;
- APIs e contratos modificados;
- alterações no PWA;
- alterações no Capacitor Android;
- permissões Android adicionadas ou removidas;
- testes executados;
- builds executados;
- workflow e commit utilizados;
- APK/AAB gerado;
- falhas encontradas;
- limitações do ambiente;
- configurações externas necessárias;
- riscos ainda existentes;
- próximos passos recomendados para a Google Play.

## Critério de excelência

A solução deve ser:

- funcional;
- segura;
- consistente;
- acessível;
- responsiva;
- testável;
- manutenível;
- visualmente coerente;
- compatível entre navegador, PWA e Android Capacitor;
- preparada para produção;
- documentada;
- baseada em validação real;
- adequada à distribuição comercial pela Google Play.

Seja criativo e avançado nas soluções, mas não introduza complexidade sem justificativa. Questione premissas frágeis, identifique zonas de estagnação, corrija inconsistências com firmeza e priorize funcionamento real em vez de aparência de progresso.

Não apenas descreva o que deveria ser feito. Faça as alterações necessárias no repositório e prove o resultado por meio de testes, builds e verificações técnicas.
