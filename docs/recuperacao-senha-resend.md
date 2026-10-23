# Recuperação de senha do Mais1km (Resend)

## Variáveis do servidor

Configure no ambiente do serviço backend (não no frontend):

- `RESEND_API_KEY`: chave secreta da API do Resend.
- `RESEND_FROM`: remetente de um domínio verificado no Resend, por exemplo `Mais1km <conta@seudominio.com.br>`.
- `APP_PUBLIC_URL`: URL HTTPS pública do aplicativo, sem barra final, por exemplo `https://app.seudominio.com.br`.

Nunca coloque a chave do Resend em variáveis `VITE_*`, no código do navegador ou no repositório.

## Configuração no Resend

1. Adicione e verifique o domínio de envio no painel do Resend.
2. Publique os registros DNS solicitados pelo Resend no provedor do domínio.
3. Gere uma API key com acesso de envio e cadastre-a como segredo no ambiente do backend.
4. Configure o remetente verificado e a URL pública HTTPS.
5. Reinicie/reimplante o backend e confirme que a configuração foi aplicada.

## Banco de dados

A migração `007_recuperacao_senha.sql` é aplicada pelo inicializador de banco já existente. Ela cria a tabela de tokens com hash, expiração, uso, hash do IP e índices. Faça backup antes de aplicar em produção e confirme os logs de inicialização.

## Fluxo e proteções

- Solicitação: `POST /api/conta/recuperar-senha` com `{ "email": "..." }`.
- Redefinição: `POST /api/conta/redefinir-senha` com `{ "token": "...", "senha": "..." }`.
- Token aleatório, armazenado somente como SHA-256, válido por 30 minutos e de uso único.
- Resposta da solicitação não revela se o e-mail existe.
- Limite por IP: 5 solicitações por 15 minutos; limite por conta: 3 solicitações por hora.
- A redefinição troca o hash da senha e invalida as sessões existentes.

## Checklist de implantação

- [ ] Domínio de envio verificado no Resend.
- [ ] `RESEND_API_KEY`, `RESEND_FROM` e `APP_PUBLIC_URL` configurados como segredos/variáveis do backend.
- [ ] Migração aplicada sem erro.
- [ ] Testar e-mail real em conta de homologação.
- [ ] Testar token expirado, inválido e reutilizado.
- [ ] Testar limite de solicitações e login com a nova senha.
- [ ] Confirmar que as sessões anteriores deixam de funcionar.

Não habilite o recurso em produção antes dos testes de ponta a ponta.
