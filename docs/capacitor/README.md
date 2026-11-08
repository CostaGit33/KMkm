# Android Mais1km com Capacitor

**Decisão:** o PWA existente é a aplicação principal e será empacotado para Android com Capacitor. Não reconstruir as telas em Flutter nem criar uma segunda implementação das jornadas do participante.

## Objetivos

- Preservar integralmente a experiência web, a arquitetura de produto, a pesquisa de usuários e as decisões de UX já realizadas.
- Manter PWA e Android como duas formas de acessar a mesma aplicação e os mesmos dados.
- Usar plugins Capacitor ou código Android nativo apenas quando uma capacidade do navegador não atender ao requisito.
- Não alterar API, MySQL, regras de carimbo, TAGs, domínio ou produção para criar o invólucro Android.
- Continuar entregando a PWA normalmente; a compilação Android deve ser uma etapa adicional e independente.

## Baseline verificada na branch main

- Cliente: `client/`, Vite 6, JavaScript, HTML e CSS; React é usado em componentes específicos.
- Entrada web: `client/index.html` → `client/src/main.js`.
- Build: `npm run build --prefix client`, saída em `client/dist`.
- Manifest PWA: `client/public/manifest.webmanifest`.
- Service Worker: `client/public/sw.js`; o cache não armazena respostas privadas de `/api/`.
- Backend: `server/`, API Node/Express e MySQL existentes.
- API oficial: `https://mais1km.novaagencian8n.online`.
- Package Android já gerado: `online.novaagencian8n.mais1km`. Confirmar a manutenção deste identificador antes de publicar na Google Play; alterá-lo depois significa publicar outro aplicativo.
- A aplicação web possui rotas especiais de TAG em `/t/:codigo`; o parâmetro secreto `?k=` é removido da URL pelo código web antes de telemetria.

## Versão de referência

A integração usa Capacitor **8.6.0** (`@capacitor/core`, `@capacitor/cli` e `@capacitor/android` alinhados), `@capacitor/app` **8.1.2** para App Links e `@capacitor/geolocation` **8.2.4** para GPS quando exigido no carimbo. As dependências e o `package-lock.json` estão versionados. O projeto Android nativo está em `client/android/`, com Gradle Wrapper 8.14.3, Java 21 e compile/target SDK 36.

## Arquitetura alvo

```text
PWA (browser) ──────────────┐
                            ├── client/ (uma aplicação web)
Android (Capacitor WebView) ┘          │
                                       ├── API Node/Express atual
                                       └── MySQL atual
                                              │
                                     regras e estado oficiais
```

O Capacitor deve carregar o build local `client/dist` dentro do Android WebView. Não configurar a aplicação Android para abrir o site de produção como um simples navegador remoto: isso enfraqueceria a experiência offline, o controle de versão e a integração com plugins nativos.

## Regras de preservação

1. Não reescrever telas, CSS, componentes, navegação ou fluxos já validados do PWA.
2. Não alterar os endpoints nem criar outro backend ou banco.
3. Não persistir sessão em localStorage. Validar o comportamento do cookie `mais1km_session` HttpOnly no WebView Android; se necessário, implementar integração nativa de cookie compatível com a API sem expor o valor ao JavaScript.
4. Não armazenar em cache respostas privadas da API e não reapresentar cadernetas de outra conta após logout.
5. O servidor continua sendo a única autoridade para carimbos, XP, coleção, eventos, geofence e repetição.
6. Não confirmar carimbo offline. Se não houver rede ou resposta, informar que o resultado não foi confirmado.
7. Solicitar GPS somente no fluxo de carimbo e somente quando a API exigir. Manter precisão máxima de 50 m e raio de validação do servidor de até 100 m.
8. Preservar URLs de NFC/QR existentes, incluindo `/t/:codigo`; remover e proteger `?k=` contra logs, analytics e histórico.
9. Não solicitar permissões sem contexto nem coletar bateria, sensores ou fingerprint do aparelho.
10. Nenhuma alteração de produção, migração de banco, publicação Play Store ou distribuição pública nesta fase.

## Fases

- [x] F0 — Baseline do repositório e decisão arquitetural inicial documentadas; configuração Capacitor criada. Inventário detalhado de paridade segue como parte da F1.
- [x] F1 — Integrar Capacitor 8.6.0 ao cliente Vite, configurar `webDir: dist`, scripts e origem da API para o build Android. Build PWA e bundle Android aprovados na CI.
- [x] F2 — Gerar e versionar o projeto Android nativo. O package ID já está configurado; identidade visual nativa, splash, status/navigation bars e assinatura de release ainda precisam de acabamento.
- [ ] F3 — Validar em aparelho navegação, rotas de TAG, autenticação/cookies, sessão, logout e links externos no WebView. A implementação inicial de `appUrlOpen` e link de inicialização está no cliente; falta validar o comportamento real do Android.
- [ ] F4 — Implementar/validar capacidades nativas estritamente necessárias: App Links de TAG e GPS sob demanda já estão integrados em código; câmera/QR, compartilhamento e notificações ficam para as jornadas que realmente precisarem. A leitura de uma TAG NDEF que contém URL HTTPS usa App Links; leitura NFC bruta não foi adicionada.
- [x] F5a — CI reproduzível: build PWA + build Android + APK debug de validação publicado como artefato.
- [ ] F5b — Testes de paridade PWA × Android em aparelho, APK de release e AAB assinado para distribuição quando autorizado.

## Primeiro APK de validação (04/11/2026)

- GitHub Actions: [execução 41874304473](https://github.com/CostaGit33/KMkm/actions/runs/41874304473) — PWA e Android concluíram com sucesso.
- Artefato: `mais1km-capacitor-debug` (APK debug, não assinado para publicação).
- O APK comprova que o bundle web local foi incorporado e o projeto Gradle compila. A versão gerada antes da integração de App Links/GPS não valida esses plugins. Mesmo no build mais recente, CI não comprova login, cookie HttpOnly, GPS real, câmera, NFC, App Links verificados nem paridade funcional em aparelho.
- Build Android usa `client/.env.android` para apontar à API oficial. Esse arquivo contém somente URL pública, não segredo.
- O manifesto declara App Links HTTPS para `/t/` em `mais1km.novaagencian8n.online`. Para o Android validar a associação do domínio, ainda é necessário servir `/.well-known/assetlinks.json` com o SHA-256 do certificado final de distribuição; não usar uma impressão digital inventada nem o certificado debug como chave de produção.
- O GPS nativo é solicitado somente após a API pedir localização para o carimbo; o fluxo web continua usando `navigator.geolocation`.
- Todas as chamadas à API do participante e da administração que eram relativas foram migradas para a origem configurável; mídia `/midia/` e endpoints `/api/` também são resolvidos no host da API.


## Origem e sessão no Android

O código do servidor usa proteção CSRF por comparação do cabeçalho `Origin` com o host da API e bloqueia requisições declaradas como `cross-site`; o cookie da conta é `HttpOnly; SameSite=Lax; Secure` em HTTPS. Portanto, deixar o WebView com a origem padrão `https://localhost` e apenas apontar a API para outro domínio quebraria operações autenticadas de escrita e a persistência do cookie.

O WebView Android mantém o hostname local padrão `localhost` com esquema HTTPS (`https://localhost`). Não configurar o hostname local com o domínio da API: o servidor de assets do Capacitor intercepta requisições destinadas ao hostname local e isso pode desviar chamadas `/api` para dentro do WebView em vez do backend. O frontend usa `VITE_API_BASE_URL` para chamar o domínio público da API. `CapacitorHttp` está habilitado para transportar `fetch` pela pilha HTTP nativa, e `CapacitorCookies` permanece habilitado para integração de cookies. O backend permite requisições sem cabeçalho `Origin` (comportamento esperado em clientes HTTP nativos), mas continua aplicando a verificação CSRF a requisições de navegador. O cookie HttpOnly não é copiado para localStorage nem exposto ao JavaScript. A sessão ainda precisa de validação com login, chamadas POST, reinício do app e logout em aparelho Android.

O Service Worker continua ativo no PWA de navegador. No Android Capacitor, a aplicação usa assets embarcados e não registra um segundo Service Worker, evitando uma camada de cache adicional na origem compartilhada.

## Critério de conclusão

O Android só será considerado equivalente quando as jornadas e telas do PWA tiverem uma matriz de testes com resultado no navegador e no Android. Um APK que apenas abre a home não representa migração concluída.

## Situação da migração Flutter anterior

A tentativa Flutter fica suspensa como direção de produto. O PR #41 (`fix/flutter-nfc-tag-reader`) permanece sem merge e não é base da implementação Capacitor. O diretório `mobile/` e a documentação anterior são preservados temporariamente como histórico/referência; não devem ser ampliados nem usados como fonte de telas. Os workflows Flutter legados foram removidos da automação ativa; o workflow oficial de release Android é `.github/workflows/mobile-release.yml`, baseado em Capacitor. A remoção do código Flutter será tratada separadamente, depois de confirmar que não há dependência operacional e sem apagar histórico útil.
