# Avaliação de Capacitor, Flutter e PWA para o +1 KM

**Data:** 7 de novembro de 2026  
**Objetivo:** escolher a estratégia tecnológica mais adequada para publicar e operar comercialmente o +1 KM na Google Play.

## Conclusão executiva

Para o estado atual do +1 KM, a melhor decisão é **manter o PWA como núcleo do produto e usar Capacitor como aplicativo Android oficial na Google Play**.

Essa combinação preserva o investimento existente em interface, rotas, autenticação, caderneta, carimbos e API. Ao mesmo tempo, entrega um pacote Android nativo, com permissões próprias, acesso a GPS e NFC, links de aplicativo e possibilidade de evolução para recursos nativos. A documentação do Capacitor confirma que o aplicativo empacotado é um aplicativo Android normal para fins de publicação na Google Play.[1]

**Flutter é tecnicamente forte, mas neste momento representaria uma reescrita de alto custo e alto risco.** Ele deve ser considerado apenas se o produto passar a exigir uma experiência predominantemente nativa, trabalho offline complexo, mapas e sensores avançados, animações muito intensas ou uma equipe dedicada a Dart/Flutter.

**O PWA deve continuar existindo mesmo que o Capacitor seja adotado.** Ele é o melhor canal para acesso imediato por QR Code, compartilhamento de links, campanhas, SEO e usuários que não querem instalar nada. Porém, como único produto comercial na Play Store, ele oferece menos controle sobre permissões, distribuição e experiência nativa.

## 1. Capacitor no projeto atual

### Pontos fortes

O Capacitor aproveita diretamente o frontend web já existente. A maior parte do código permanece compartilhada entre navegador e Android. Isso reduz o tempo de entrega, evita uma segunda implementação da regra de negócio e facilita manter a experiência do site e do aplicativo alinhadas.

Ele também permite usar plugins nativos quando o navegador não é suficiente. No projeto atual já existe integração com `@capacitor/geolocation`, e o aplicativo pode declarar permissões Android, tratar localização precisa e usar NFC, links de aplicativo e outros recursos do sistema. A documentação do plugin confirma que o GPS preciso exige `ACCESS_COARSE_LOCATION` e `ACCESS_FINE_LOCATION` no manifesto Android.[2]

O Capacitor é adequado à Google Play porque gera um projeto Android real. O APK de validação já foi compilado pelo GitHub Actions com `targetSdkVersion = 36`, `compileSdkVersion = 36` e `minSdkVersion = 24`. O `targetSdkVersion` 36 está alinhado ao requisito atual para novos apps e atualizações enviados depois de 31 de agosto de 2026.[3]

A distribuição comercial também não exige uma tecnologia diferente: será necessário gerar um **Android App Bundle (`.aab`) de release**, assinar o app e configurar o Play App Signing. O processo é o mesmo de um aplicativo Android nativo comum.[1]

### Pontos fracos e riscos

O Capacitor não elimina as diferenças entre navegador e Android. Cada permissão, plugin, versão do Android e comportamento de fabricante precisa ser testado separadamente. O problema recente do GPS ilustra esse risco: o plugin estava incluído, mas o manifesto não declarava as permissões necessárias.

O aplicativo atual ainda está em estágio de validação. O workflow gera um APK debug, não um AAB de release assinado. Para uso comercial ainda faltam, no mínimo, configuração de assinatura, incremento de `versionCode`, geração de AAB, ícones e splash finais, política de privacidade, preenchimento do Play Console, testes em aparelhos reais e tratamento de atualização.

Também é importante controlar o uso de conteúdo remoto. O app usa um bundle web local e conversa com a API. Isso é bom para inicialização e disponibilidade da interface, mas exige disciplina de compatibilidade entre a versão do app e a versão da API. Mudanças incompatíveis no backend podem quebrar versões antigas instaladas.

### Avaliação

**Capacitor para o +1 KM: 8,5/10.** É a melhor relação entre velocidade, reaproveitamento, acesso nativo e risco de execução para o produto atual.

## 2. Flutter

### Pontos fortes

Flutter entrega uma experiência visual consistente e predominantemente nativa em Android e iOS. A interface é renderizada pelo próprio framework, o que reduz algumas diferenças de navegador, CSS e WebView. Ele também oferece bom desempenho para animações, transições, mapas, interações complexas e telas com muita atualização visual.

O processo de publicação é maduro. A documentação oficial orienta configurar uma chave de upload, usar o Play App Signing e gerar um App Bundle para a Google Play.[4] Flutter também possui suporte a flavors, ambientes de produção e testes, observabilidade e automação de release.

Para uma empresa que pretende construir um produto mobile amplo, com equipe própria de Flutter, o framework pode se tornar uma excelente base. Ele é especialmente interessante se o roadmap incluir uma experiência muito rica de mapa, uso prolongado offline, sincronização local sofisticada, notificações, câmera, Bluetooth, NFC avançado e componentes nativos específicos.

### Pontos fracos e riscos

A principal desvantagem para o +1 KM é o custo de migração. O projeto atual é um produto web funcional. Uma migração para Flutter exigiria reimplementar telas, navegação, estados, autenticação, formulários, carimbos, caderneta, galeria, mapas, tratamento de erros e boa parte dos testes. O backend poderia ser mantido, mas a camada de apresentação e muitos fluxos seriam duplicados ou substituídos.

Flutter também criaria uma separação maior entre o produto web e o aplicativo. Cada alteração passaria a exigir decisão sobre duas implementações. Isso é aceitável quando o aplicativo nativo é o produto principal, mas é desvantajoso enquanto o PWA ainda é importante para abrir uma tag, ler um QR Code e acessar a experiência sem instalação.

A existência de plugins Flutter não elimina o trabalho nativo. GPS, NFC, câmera, notificações e armazenamento ainda exigem permissões, testes em aparelhos e atenção a mudanças do Android. Portanto, Flutter não teria evitado automaticamente o tipo de problema de permissão encontrado no Capacitor.

### Avaliação

**Flutter para uma futura versão nativa do +1 KM: 8/10.** É uma boa escolha para uma reescrita planejada, mas não é a melhor escolha para o próximo lançamento comercial, porque o custo de reimplementação é desproporcional ao benefício atual.

## 3. PWA

### Pontos fortes

O PWA é o canal mais simples de distribuir. O usuário pode abrir um link de campanha, QR Code ou tag NFC sem instalar um aplicativo. Ele funciona em Android, desktop e, com limitações, em outros sistemas. A atualização do frontend é imediata e centralizada, sem depender da aprovação de uma nova versão para cada mudança visual ou correção web.

O PWA também é importante para aquisição. Uma pessoa pode conhecer um ponto, abrir a página, criar a caderneta e começar a usar o produto imediatamente. Esse fluxo é mais adequado a uma experiência de turismo, rota ou carimbo do que obrigar o primeiro contato a passar pela instalação de um app.

PWAs podem ser instalados no Android e podem aparecer como WebAPK. Também podem ser publicados na Google Play por meio de uma Trusted Web Activity.[5] Isso torna possível usar a Play Store sem reescrever toda a aplicação.

### Pontos fracos e riscos

A experiência instalada varia conforme navegador, fabricante e modo de instalação. Um WebAPK tem capacidades melhores; um simples atalho pode ter ícone identificado pelo navegador e não aparecer da mesma forma em Configurações ou no launcher. A documentação do web.dev diferencia esses cenários explicitamente.[5]

Há também diferenças de suporte entre navegadores. Geolocalização é uma capacidade madura, mas outras APIs, incluindo NFC, Bluetooth, geofencing, tarefas em segundo plano e integração profunda com o sistema, têm disponibilidade variável. A orientação oficial para PWAs é detectar recursos e aplicar melhoria progressiva, sem presumir que todas as plataformas ofereçam a mesma capacidade.[6]

Uma Trusted Web Activity não é equivalente a um aplicativo nativo completo. O conteúdo vem da web e o host Android não tem acesso direto ao estado web, cookies ou `localStorage`; a integração entre host e página precisa ocorrer por mecanismos limitados, como URLs e intents.[7]

Como canal comercial, o PWA também depende mais de conexão e de comportamento do navegador. O service worker melhora a experiência, mas não transforma automaticamente uma aplicação conectada à API em um produto offline completo.

### Avaliação

**PWA como canal web e de aquisição: 9/10.**  
**PWA como único aplicativo comercial na Google Play: 6,5/10.**

## Comparação orientada ao objetivo comercial

### Publicação na Google Play

Capacitor e Flutter oferecem um projeto Android nativo e uma rota direta para AAB, assinatura e Play App Signing. O PWA pode chegar à Play por Trusted Web Activity, mas exige validação adicional de experiência web, Digital Asset Links e comportamento do navegador.

Para o +1 KM, Capacitor tem a vantagem de entregar uma publicação convencional sem abandonar o código web. Flutter também atende bem, mas exige a reescrita da camada mobile.

### GPS, NFC e presença no local

Para o carimbo, o fator decisivo não é somente o framework. É necessário ter permissões corretas, solicitar a permissão no momento adequado, interpretar precisão, tratar localização desativada, lidar com aparelhos sem GPS e testar em campo.

Capacitor já está integrado ao projeto e agora possui as permissões Android corrigidas. O PWA continua útil em navegadores compatíveis, mas possui mais variações de permissão e suporte. Flutter oferece bom acesso nativo, porém exigiria reimplementar o fluxo.

### Velocidade de evolução

PWA é o mais rápido para alterações web. Capacitor preserva quase essa mesma velocidade. Flutter é o mais lento para a primeira migração, embora possa ser eficiente no longo prazo com uma equipe exclusivamente mobile.

### Manutenção

Manter PWA + Capacitor é uma manutenção compartilhada, mas exige uma matriz de testes web/Android. Manter PWA + Flutter significa manter duas interfaces, dois conjuntos de testes e duas implementações para parte dos fluxos. Uma solução Flutter única reduziria a duplicidade mobile, mas sacrificaria o acesso imediato pela web.

### Monetização e operação comercial

As três alternativas podem suportar login, assinatura, pagamentos e modelos comerciais, mas esses recursos precisam obedecer às políticas da Google Play quando o pagamento compra conteúdo ou funcionalidades digitais dentro do app. A escolha do framework não substitui a análise de política, privacidade, consentimento, exclusão de conta e proteção de dados.

## Recomendação para o +1 KM

### Decisão recomendada agora

1. **Manter o PWA como produto web principal e porta de entrada.**
2. **Lançar o Android comercial usando Capacitor.**
3. **Usar o mesmo backend e a mesma lógica de negócio.**
4. **Continuar usando o PWA fora da Play Store para QR Codes, links, campanhas e acesso sem instalação.**
5. **Não iniciar uma migração para Flutter antes de haver uma necessidade nativa concreta e uma equipe para sustentá-la.**

### O que precisa ser concluído antes da publicação comercial

- Gerar **AAB de release**, não somente APK debug.
- Criar e proteger o keystore de upload; não armazená-lo no Git.
- Ativar Play App Signing.
- Confirmar `applicationId` definitivo, porque ele não deve ser alterado depois da publicação.[4]
- Manter `targetSdkVersion = 36` e revisar dependências contra o Android 16.
- Testar GPS preciso, localização desativada, permissão negada, baixa precisão, ausência de sinal e aparelhos Android de diferentes fabricantes.
- Testar NFC, QR Code, App Links, login, recuperação de senha, sessão, logout, atualização e reinstalação.
- Criar política de privacidade clara, especialmente para localização, conta, fotos e dados de visita.
- Configurar monitoramento de erros e um canal de suporte.
- Preparar descrição, screenshots, ícone, classificação etária, formulário de segurança de dados e credenciais de revisão.
- Fazer teste fechado com pelo menos 12 testadores inscritos por 14 dias se a conta pessoal do Play Console tiver sido criada depois de 13 de novembro de 2023.[8]
- Publicar primeiro em teste interno, depois em teste fechado e somente então solicitar acesso à produção.

## Decisão final

**Capacitor é a escolha recomendada para a primeira publicação comercial Android.** Ele entrega o caminho mais curto até a Google Play e conserva o PWA, que é estratégico para o modo de uso do +1 KM.

**Flutter é uma opção futura, não uma necessidade atual.** Deve entrar novamente na decisão se o aplicativo se tornar predominantemente nativo ou se os limites operacionais do PWA + Capacitor produzirem custos maiores que uma reescrita.

**PWA não deve ser abandonado.** Ele é o melhor canal de descoberta, acesso por link e utilização sem instalação. A arquitetura ideal neste momento é web-first com uma casca Android Capacitor bem testada, não três produtos independentes.

## Referências

[1]: https://capacitorjs.com/docs/android/deploying-to-google-play "Deploying your Capacitor Android App to the Google Play Store"

[2]: https://capacitorjs.com/docs/apis/geolocation "Capacitor Geolocation API"

[3]: https://support.google.com/googleplay/android-developer/answer/11926878?hl=pt-BR "Requisitos de nível desejado da API para apps do Google Play"

[4]: https://docs.flutter.dev/deployment/android "Build and release an Android app"

[5]: https://web.dev/learn/pwa/installation "PWA installation and app catalogs"

[6]: https://web.dev/learn/pwa/capabilities "PWA capabilities"

[7]: https://developer.chrome.com/docs/android/trusted-web-activity "Trusted Web Activity overview"

[8]: https://support.google.com/googleplay/android-developer/answer/14151465?hl=pt-BR "Requisitos de teste para novas contas pessoais de desenvolvedor"
