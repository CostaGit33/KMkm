# Próxima etapa de implantação — +1 KM v8.3

## Correções adicionais desta revisão

- O fluxo de carimbo agora bloqueia a linha do usuário dentro da transação antes de verificar carimbos recentes. Isso serializa requisições simultâneas da mesma conta e reduz o risco de dois carimbos de rota gerados por toques quase simultâneos.
- `/api/saude` agora consulta o banco (`SELECT 1`) e responde `{"ok":true,"banco":"ok"}` apenas quando a conexão com o MySQL funciona. O endpoint deve responder erro HTTP 500 quando a consulta falhar.

## Estado de validação

- Verificação de sintaxe Node.js: aprovada para os arquivos JS do servidor e módulos JS principais do cliente.
- Build Vite: ainda não validado neste ambiente, pois as dependências não puderam ser instaladas/confirmadas; é obrigatório executar `npm run build` num ambiente com npm e acesso às dependências.
- Teste ponta a ponta com MySQL: ainda não executado. Não considerar o sistema pronto para usuários até completar o checklist abaixo.

## Implantação segura — sem apagar o banco local

1. Guarde o ZIP original e faça uma cópia do diretório de trabalho. Não rode `DROP DATABASE`, não remova o volume Docker `mysql_data` e não substitua o banco local por um banco remoto vazio.
2. No computador onde o projeto está extraído, abra um terminal na pasta raiz `caderneta-v8.3`.
3. Instale as dependências e compile o cliente:

   ```bash
   npm run setup
   npm run build
   ```

4. Se o banco local já contém dados, faça backup antes de migrações. Exemplo para o MySQL local padrão deste projeto:

   ```bash
   docker compose up -d db
   docker compose exec -T db sh -c 'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers caderneta' > backup-caderneta-antes-migracao.sql
   ```

   Confira se o arquivo não está vazio e guarde uma cópia fora da pasta do projeto. Não publique esse arquivo nem o `.env` em GitHub.

5. Crie um MySQL gerenciado/persistente no provedor escolhido. Use usuário exclusivo, senha forte, TLS conforme instruções do provedor e restrição de rede. Não use as credenciais de desenvolvimento `caderneta:caderneta` nem a senha `root` em produção.
6. Configure `DATABASE_URL` no painel de variáveis do serviço de API, no formato `mysql://USUARIO:SENHA@HOST:3306/NOME_BANCO`, codificando caracteres especiais da senha. Defina `APP_TZ=America/Bahia` e deixe o provedor definir `PORT` quando exigido. Nunca compartilhe a URL completa porque contém credenciais.
7. Antes de inicializar/migrar o banco remoto, confirme que ele é o banco correto e faça um dump se já contiver dados. O servidor chama `initializeDatabase()` ao iniciar, então migrações/seed são executados no boot.
8. Faça deploy da aplicação com o comando de build incluído no Dockerfile ou rode `npm run build` e depois `npm start`. Ative HTTPS no provedor.
9. Verifique `https://SEU-DOMINIO/api/saude`. Resultado esperado: HTTP 200 com `{"ok":true,"banco":"ok"}`. Isso testa processo + consulta simples ao MySQL, não todo o fluxo.
10. Crie uma conta de teste, publique somente uma tag autorizada e vistoriada, toque a tag no celular e confira que o carimbo aparece após resposta do servidor. Faça logout/login e abra a mesma conta em outro aparelho para verificar persistência.

## Checklist de carimbo antes do piloto

- [ ] Tag desconhecida retorna erro e não cria carimbo.
- [ ] Tag pendente retorna HTTP 409 e não cria carimbo.
- [ ] Conta sem sessão não consegue carimbar.
- [ ] Primeiro toque numa tag publicada cria um registro no banco.
- [ ] Toques repetidos rápidos não criam carimbos de rota duplicados.
- [ ] Dois pedidos simultâneos da mesma conta não duplicam o carimbo de rota.
- [ ] Resposta de erro/rede não é apresentada como carimbo confirmado.
- [ ] Histórico permanece após sair e entrar novamente e em outro dispositivo.
- [ ] Banco e serviço são recuperáveis a partir de backup testado.
- [ ] Pelo menos cinco pontos foram vistoriados, autorizados e só então publicados.
- [ ] Cada etiqueta instalada foi testada em mais de um modelo de telefone.
- [ ] Existe procedimento para despublicar uma tag danificada ou compartilhada indevidamente.

## Publicação de ponto

Não publique as oito tags apenas para “testar” em público. Primeiro valide local e autorização. Depois, no servidor e usando o diretório do projeto, o comando documentado é:

```bash
npm --prefix server run pontos -- listar
npm --prefix server run pontos -- publicar eu-001
```

Substitua `eu-001` apenas por um código cuja ficha de vistoria esteja aprovada. Para reverter, use `npm --prefix server run pontos -- despublicar eu-001`.

## Limitação importante do NFC

A tag abre uma URL; isso não comprova criptograficamente que a pessoa esteve fisicamente no ponto. Para o piloto, use códigos longos/aleatórios, monitore uso anômalo e mantenha capacidade de revogar/substituir etiquetas. Se a prevenção a fraude for requisito forte, planeje uma segunda etapa de segurança.
