> **Documento histórico.** Descreve uma versão anterior do projeto e **não** reflete o estado atual. Para o estado de hoje: [README](../../README.md), [CHANGELOG](../../CHANGELOG.md) e [índice](../INDEX.md).

# Verificação da V8.4 (administração)

Feito neste ambiente (MariaDB 10.11, Node 22, Chromium):

- **API (72 verificações):** permissões (sem login 401, conta comum 403, admin 200), CRUD de pontos/rotas/circuitos/eventos, validação de coordenadas, reordenação (e rejeição de lista incompleta), exclusão bloqueada com carimbos, regras de evento e patrocínio (6–8 pontos, conflito de janela, janela travada com carimbos, relatório `<5`), papel lido a cada requisição, não alterar/excluir a si mesmo, exclusão de pessoa com carimbos, registro de ações, bloqueio cross-site.
- **Migração:** banco V8.3 com dados (pontos publicados, carimbo) atualizado para V8.4 sem perder nada; instalação nova (banco vazio) criando 18 pontos, 2 rotas, 4 circuitos; seeds não recriam o que o admin apagou/renomeou após reiniciar.
- **Tela (35 verificações, Chromium):** login e erro de senha, criar/editar/publicar/arquivar/excluir ponto, colar "lat, lng", busca e filtro (reordenação travada), arrastar com mouse e com teclado (↑ ↓), editor de pontos do circuito, rota, evento, relatório, pessoas, registro, celular de 390 px sem rolagem horizontal, sair.
- **App:** `client` compila (`npm run build`, duas entradas); o catálogo do servidor substitui o fixo (renomear, criar, arquivar, circuitos, coleções) e cai para a cópia local sem rede.

Não testado: MySQL 8.4/9.x (o seu é 9.7.2; os comandos usados são padrão), Safari/Firefox, toque em celular real, HTTPS com cookie `SameSite=None; Secure`, NFC real, carga.

Limites conhecidos: a ordem global dos pontos no mapa segue o código; o app lê o catálogo ao abrir (não em tempo real); não há verificação de e-mail no cadastro; o admin não edita as páginas de texto da jornada nem o PDF/certificado.
