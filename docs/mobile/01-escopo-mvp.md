# Escopo do MVP Android — Mais1km

**Status:** escopo técnico inicial documentado; publicar a decisão de negócio somente após confirmação do responsável.
**Plataforma:** Android.
**Cliente:** Flutter novo, em paralelo à PWA.
**Fonte da verdade:** API e MySQL atuais.

## Objetivo

Oferecer ao participante uma experiência Android nativa para as jornadas essenciais do Mais1km, sem substituir a PWA, criar regras ou progresso locais, migrar o painel administrativo ou exigir novo backend.

## Público e jornadas dentro do MVP

1. Criar conta e entrar com a conta Mais1km.
2. Recuperar/redefinir senha conforme os endpoints disponíveis.
3. Consultar catálogo, pontos publicados, circuitos e rotas.
4. Visualizar detalhes e fotos aprovadas de um ponto.
5. Abrir a experiência da tag por link NFC/QR e solicitar carimbo online.
6. Ver o resultado devolvido pelo servidor e atualizar caderneta/coleção.
7. Consultar eventos e patrocínios quando expostos no catálogo/caderneta.
8. Consultar XP, nível, medalhas e pódio; participação no pódio permanece opt-in explícito.
9. Consultar/atualizar perfil, abrir políticas e encerrar sessão.

A exclusão de conta é uma capacidade existente na API (`DELETE /api/eu`) e deverá ser validada no plano de homologação antes de lançamento. A forma exata de apresentá-la no MVP precisa permanecer consistente com a tela web atual e os requisitos de publicação.

## Telas funcionais previstas

- Entrada/cadastro/recuperação.
- Início/resumo remoto.
- Mapa e catálogo com filtros essenciais.
- Lista/detalhe de rotas e circuitos.
- Detalhe do ponto.
- Resultado de carimbo (aguardando, confirmado, repetido ou falha conforme resposta real).
- Caderneta/coleção.
- Eventos/patrocínios.
- Gamificação/pódio e escolha de participação.
- Perfil, privacidade e logout.

O painel administrativo continua no site e não integra o MVP móvel.

## Requisitos não funcionais

- App fala somente com API HTTPS existente em homologação/produção autorizada.
- Sessão persistida com armazenamento seguro, após prova de conceito.
- Respostas tipadas; timeouts e erros previsíveis tratados sem perda silenciosa de estado.
- Nenhuma senha, cookie, token de sessão, chave `?k=` ou dado sensível em logs.
- Permissão de localização solicitada no contexto de carimbo quando a API exigir; negar permissão não bloqueia exploração do catálogo.
- Nenhuma conquista, XP, medalha ou carimbo é declarado confirmado antes do servidor.
- Manter consistência de dados PWA↔app.

## Fora de escopo do primeiro lançamento

- iOS.
- Migração do painel administrativo.
- Backend, identidade, banco ou regras de negócio separados.
- Confirmação de carimbo offline ou banco local SQLite/Drift.
- Localização contínua/em segundo plano.
- Coleta de nível de bateria, sensores ou fingerprint detalhado de aparelho.
- Telemetria própria em massa, perfis comportamentais ou previsão de abandono.
- Machine learning e recomendações personalizadas.
- Substituição de tags NFC/QR estáticas ou alegação de prova criptográfica de presença.
- Push notifications como requisito do MVP.

## Critérios de aceite do MVP

- Conta de teste pode cadastrar-se/entrar, reabrir o app mantendo sessão dentro do prazo e fazer logout que revoga a sessão.
- Usuário pode ver catálogo mesmo sem conceder localização.
- Fluxo de carimbo usa os campos e os códigos de resposta reais da API e só mostra conclusão após sucesso do servidor.
- Carimbo feito no Android aparece na PWA e vice-versa após atualização da caderneta.
- Dados de eventos, cartas, gamificação e opt-in são os retornados pelo servidor.
- Sessão expirada, ausência de rede, rate limit, GPS negado e dados ausentes têm tratamento verificável.
- Build debug é repetível; testes de unidade/widget/contrato existem e passam.
- Site e backend continuam passando na CI atual.

## Decisões de produto ainda não aprovadas

- Nome/identidade visual final do app e se haverá pequenas adaptações nativas de interface.
- Versão mínima do Android e aparelhos de suporte.
- Canal inicial e plano de suporte (APK interno, teste fechado Play ou ambos).
- Métrica e tamanho do piloto, pontos e participantes autorizados.

Estas decisões não impedem documentação da Fase 0, mas precisam ser fechadas antes da publicação/distribuição externa.
