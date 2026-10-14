# Entregas da versão 5 do +1KM

- Integrar a experiência completa do V3, preservando caderneta, mapa, filtros, jornada de 90 dias, coleções, certificados, perfil, autenticação local e carimbos SVG generativos.
- Incorporar as melhorias do V4: menu lateral responsivo com foco/teclado, alternância de tema, instalação PWA, acesso direto às rotas e destino editorial Eunápolis.
- Manter o backend Express/MySQL-compatible e os fluxos persistentes existentes de entrada, tags, carimbagem, guardião, carimbo de turma, progresso e certificado.
- Entregar a rota pública `/t/:codigo` com tela V5 para abrir a caderneta, carimbar, mostrar progresso da rota, carimbo coletivo, guardião e retorno à caderneta.
- Preservar o manifesto, os ícones, o service worker e o cache offline; atualizar o identificador para V5 sem remover dados locais existentes.
- Configurar identidade +1KM V5, build Vite e servidor de produção sem quebrar o health check `/api/saude`.
- Validar sintaxe dos módulos, build do cliente, health check, carregamento da home, manifesto de rotas e fluxo público de tag com o seed existente.
- Preparar a próxima etapa de segurança: sessão em cookie HttpOnly/Secure/SameSite=None no Preview HTTPS, rate-limiting, validação de payloads e autorização administrativa.
- Preparar a próxima etapa operacional: CRUD administrativo de rotas/tags, geração de código revogável, QR Code e PDF A4 sem incluir tokens de sessão.
- Adicionar mapa real Leaflet/OpenStreetMap ao produto, com tiles servidos por proxy same-origin, marcadores clicáveis e identificação visual do estado dos carimbos; Eunápolis deve exibir os três pontos com coordenadas conferidas e manter os demais como coordenada pendente, sem inventar posições.

## Integração V6 futurista

- Integrar os recursos visuais da V6 futurista ao projeto atual: tema Noite Neon/Holo Dia, fontes Orbitron/Rajdhani/Alfa Slab One, abertura cinematográfica em canvas com cadastro em etapas, carimbos SVG HUD/glifos digitais e ícones PWA; preservar mapa real, segurança, e backend.
