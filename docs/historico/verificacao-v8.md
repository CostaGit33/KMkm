> **Documento histórico.** Descreve uma versão anterior do projeto e **não** reflete o estado atual. Para o estado de hoje: [README](../../README.md), [CHANGELOG](../../CHANGELOG.md) e [índice](../INDEX.md).

# Verificação V8 (somente Eunápolis)

Executado em 12/10/2026 com MariaDB 10.11 (não foi testado com MySQL 8.4, HTTPS, celular físico nem NFC real).

- Varredura de texto no projeto (sem node_modules/dist): zero ocorrências de outras cidades, do Extremo Sul, de ids `ps-*` e dos pontos regionais removidos. Exceções conscientes: a chave antiga do armazenamento local (lida uma vez para migrar o estado salvo), a migração do banco, e o nome do local "Casa Trancoso" (retorno informado de uma prova em Eunápolis).
- Banco novo: 8 pontos pendentes; carimbar pendente → 409 `ponto_nao_publicado`; após `pontos publicar`, um toque gera o carimbo da rota; patrocínio com 2 pontos recusado (6 a 8); patrocínio com 6 pontos ao vivo → mesmo toque gera carimbo da rota e do card ("Patrocinado por Café Exemplo"); caderneta mostra só a rota piloto e o card; relatório agregado mascara `<5`.
- Banco V7 existente (com rota de demonstração, rota antiga, card em pontos antigos, carimbos): migração 003 arquiva as rotas e pontos antigos, cancela o card, renomeia e renumera a rota piloto, preserva os 2 carimbos, e a caderneta passa a omitir o que foi arquivado.
- Estado salvo no aparelho (12 verificações): conta e sessão mantidas, só pontos de Eunápolis, jornada de Eunápolis aproveitada, nova chave gravada, recarga, jornada avança, importação de carimbos do servidor sem duplicar e sem aceitar ids antigos.
- Navegador real (Chromium, 390 px): caderneta, mapa, jornada, rotas, coleção, guia e perfil sem erros de script e sem seletor de cidade.
