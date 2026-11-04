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
- Package Android planejado: `online.novaagencian8n.mais1km` (confirmar antes de gerar a plataforma nativa; o valor veio da tentativa Flutter, não é ainda uma decisão de publicação).
- A aplicação web possui rotas especiais de TAG em `/t/:codigo`; o parâmetro secreto `?k=` é removido da URL pelo código web antes de telemetria.

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

- [ ] F0 — Baseline, arquitetura e inventário de paridade.
- [ ] F1 — Adicionar Capacitor ao cliente Vite, configurar `webDir: dist` e scripts; manter build PWA atual passando.
- [ ] F2 — Gerar e versionar projeto Android nativo; package ID, ícone, splash, status/navigation bars e configuração de segurança.
- [ ] F3 — Validar navegação, rotas de TAG, autenticação/cookies, sessão, logout e links externos no WebView.
- [ ] F4 — Integrar capacidades nativas estritamente necessárias: NFC, localização precisa, câmera/QR, compartilhamento e notificações quando aprovadas.
- [ ] F5 — Testes de paridade PWA × Android, CI, APK interno e AAB assinado para distribuição quando autorizado.

## Critério de conclusão

O Android só será considerado equivalente quando as jornadas e telas do PWA tiverem uma matriz de testes com resultado no navegador e no Android. Um APK que apenas abre a home não representa migração concluída.

## Situação da migração Flutter anterior

A tentativa Flutter fica suspensa como direção de produto. O PR #41 (`fix/flutter-nfc-tag-reader`) permanece sem merge e não é base da implementação Capacitor. O diretório `mobile/` e a documentação anterior são preservados temporariamente como histórico/referência; não devem ser ampliados nem usados como fonte de telas. A remoção de código Flutter será tratada separadamente, depois de confirmar que não há dependência operacional e sem apagar histórico útil.
