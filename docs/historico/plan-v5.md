> **Documento histórico.** Descreve uma versão anterior do projeto e **não** reflete o estado atual. Para o estado de hoje: [README](../../README.md), [CHANGELOG](../../CHANGELOG.md) e [índice](../INDEX.md).

# Plano — +1KM V5 integrada

## Objetivo

Criar a V5 do +1KM como evolução integrada da Caderneta de Rotas: aproveitar a interface completa do V3, incorporar o menu lateral e o destino Eunápolis do V4, preservar o PWA e manter o backend Express/MySQL-compatible já publicado como base de carimbagem física.

## Decisões de integração

- A experiência V3/V4 será a camada principal do cliente, com navegação por Caderneta, Mapa, Jornada, Rotas, Coleção, Certificados, Perfil e Eunápolis.
- `store.js`, `journey.js`, `stamp-kit.js`, conteúdo, manifestos e ícones do V3 são preservados; `data.js`, `views.js`, `styles.css` e a navegação V4 entram como evolução.
- O servidor atual continua responsável por `/api/entrar`, `/api/tags/:codigo/carimbar`, `/api/caderneta` e `/api/saude`; a rota pública `/t/:codigo` passa a abrir uma tela de carimbagem compatível com o visual V5.
- O estado offline/local continua disponível para a experiência editorial e para instalação PWA. A carimbagem física passa pelo backend persistente quando acessada por uma tag real.
- O prefixo de cache do service worker é incrementado para V5, sem apagar o estado local existente.
- Os dados demonstrativos e a página editorial de Eunápolis permanecem identificados como conteúdo que precisa de validação local antes de operação turística.

## Design V5

- **Movimento:** caderno de campo editorial com tecnologia discreta.
- **Princípios:** materialidade do papel, tinta como estado de progresso, leitura rápida ao toque e acessibilidade sem perder personalidade.
- **Paleta:** papel creme e marrom criam memória; urucum marca ação e conquista; azul, verde e ocre distinguem mar, natureza e cultura.
- **Layout:** navegação lateral em desktop, navegação inferior no celular e fichas empilhadas como páginas físicas.
- **Assinaturas:** carimbos SVG generativos com pressão/ruído, menu lateral completo e selo +1 KM.
- **Interação:** impacto breve ao carimbar, vibração opcional, foco visível, Escape para fechar o menu e `prefers-reduced-motion` respeitado.
- **Tipografia:** Alfa Slab One para títulos e selos; Special Elite para textos operacionais.
- **Essência:** transformar deslocamentos reais em memória colecionável, com uma caderneta que funciona tanto offline quanto conectada a tags físicas.
- **Voz:** direta, calorosa e concreta. “Carimbado!” e “Uma visita, uma marca.”
- **Marca:** carimbo circular com alvo +1 e borda irregular de tinta.
- **Cor proprietária:** urucum `#b8322a`.

## Estrutura

- `client/src/app.js`: shell e interação da experiência V3/V4.
- `client/src/data.js`: pontos, rotas, coleções, jornada e conteúdo de Eunápolis.
- `client/src/store.js` e `client/src/journey.js`: estado local e regras da jornada.
- `client/src/stamp-kit.js`: SVG generativo e animação de carimbo.
- `client/src/tag.js`: experiência pública da tag `/t/:codigo`, consumindo a API persistente.
- `client/src/api.js`: cliente HTTP do backend.
- `client/public/`: PWA, ícones, service worker e manifesto de rotas.
- `server/`: API, banco, seed e persistência existente.

## Próximas extensões planejadas

A base V5 fica preparada para a segunda etapa: sessão por cookie seguro, rate-limiting, administração de rotas/tags, revogação, geração de QR Codes e PDF de impressão. Essas extensões devem ser adicionadas sem substituir o fluxo de carimbagem nem expor tokens em URLs ou QR Codes.

## Integração V6 futurista — 2026-10-09
A V6 foi incorporada como uma camada visual compatível sobre a base V5. O tema usa Noite Neon como abertura e Holo Dia/Noite Neon conforme a preferência persistida; Orbitron, Rajdhani e Alfa Slab One definem a hierarquia tipográfica. A interface preserva o layout funcional, o mapa Leaflet/OpenStreetMap, os marcadores verificados, a seleção de cidade, o backend Express, a segurança e os fluxos de carimbagem.

Foram integrados `future.css` (superfícies HUD, grid, brilho, vidro e movimento), `intro.js`/`intro.css` (abertura cinematográfica em canvas e cadastro em quatro etapas), o novo kit SVG de carimbos com anéis de tiques, nós, glifos digitais e variantes holográficas, além dos ícones PWA da V6. A abertura usa linguagem neutra de cidade para continuar adequada à expansão para Eunápolis e futuras cidades.

