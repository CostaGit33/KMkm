# Mapa técnico automático do projeto

Este documento é gerado pelo script `tools/mapa-tecnico.mjs`, que lê a estrutura local do repositório e os manifestos `package.json`.

## Gerar ou atualizar

Na raiz do projeto:

```bash
node tools/mapa-tecnico.mjs
```

O comando cria/atualiza `docs/MAPA-TECNICO.md` com a árvore de arquivos, scripts e dependências declaradas e um diagrama Mermaid de arquitetura lógica.

## Escopo e limites

- Não adiciona dependências ao projeto.
- Não altera o código da aplicação, banco, autenticação ou configuração de produção.
- Não acessa segredos, APIs externas, produção ou serviços de nuvem.
- Ignora diretórios de dependências/build e limita a árvore a quatro níveis.
- O diagrama lógico é uma referência inicial; não substitui análise estática nem teste de integrações em execução.
- Depois de executar, revise e versione o arquivo gerado para atualizar o mapa no GitHub.
