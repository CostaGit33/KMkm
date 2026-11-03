# Aplicativo Android +1 KM — API existente

## Decisão de arquitetura

O aplicativo Flutter deve consumir a API já utilizada pelo site +1 KM, sem criar outro serviço, outra API, outro banco MySQL ou outro conjunto de dados.

- API base: `https://mais1km.novaagencian8n.online`
- Rotas: prefixo `/api`
- Banco: o MySQL já conectado ao serviço atual da API.
- Autenticação: sessão HTTP por cookie `mais1km_session`; o cliente Flutter precisa persistir e enviar cookies entre requisições.
- Fonte oficial dos dados: backend existente. O aplicativo não mantém banco paralelo nem replica regras de negócio.

Não será criado nem utilizado o subdomínio `android.novaagencian8n.online`. O domínio atual permanece como único endereço da API.

## Atenção: não é homologação isolada

Como o aplicativo e o site usam o mesmo serviço e banco, qualquer operação de escrita feita pelo Android altera os dados compartilhados com a produção. Não há isolamento de testes nesta arquitetura.

- Não usar cadastro, carimbo, evento, exclusão de conta ou alteração de perfil como teste sem considerar o efeito real.
- Para testar carimbos, usar somente tags/pontos de teste expressamente preparados e autorizados.
- Não apagar nem modificar dados reais para validar telas.
- Não executar migrações destrutivas ou alterar credenciais do serviço existente como parte da integração mobile.
- Não criar outro serviço, banco ou domínio para o aplicativo.

## Configuração Flutter

Definir a URL base em configuração de ambiente do aplicativo:

```dart
const apiBaseUrl = 'https://mais1km.novaagencian8n.online';
```

Todas as chamadas devem usar o prefixo `/api`. Não duplicar a URL em cada tela; centralizar a configuração no cliente HTTP.

O cliente HTTP deve:
1. Manter um cookie jar persistente e seguro para o cookie de sessão.
2. Enviar cookies nas chamadas autenticadas.
3. Consultar `GET /api/conta/sessao` para restaurar a sessão ao abrir o app.
4. Executar `POST /api/conta/sair` no logout.
5. Nunca registrar senha, cookie, chave NFC, token de redefinição ou coordenadas sensíveis em logs.

O backend atual não entrega token Bearer no JSON do login. Não implementar autenticação presumindo que exista esse token.

## Rotas já previstas no contrato mobile

- `POST /api/conta/criar`
- `POST /api/conta/entrar`
- `GET /api/conta/sessao`
- `PUT /api/conta`
- `POST /api/conta/recuperar-senha`
- `POST /api/conta/redefinir-senha`
- `POST /api/conta/sair`
- `DELETE /api/eu` — operação destrutiva; não usar em testes comuns.
- `GET /api/catalogo`
- `GET /api/config-mapa`
- `GET /api/caderneta`
- `POST /api/tags/:codigo/carimbar`
- `POST /api/eventos/:slug/carimbar`
- `GET /api/gamificacao/me`
- `GET /api/gamificacao/podio`
- `PUT /api/gamificacao/participacao`
- `GET /api/pontos/:codigo/imagens`

O contrato detalhado e as regras de payload devem ser conferidos em `docs/mobile/02-mapa-api.md`. O servidor permanece responsável por validar autenticação, autorização, geofence e regras de carimbo.

## Verificação segura

Antes de integrar uma funcionalidade, conferir a rota e o contrato no código/documentação. Priorizar leituras não destrutivas, como `GET /api/saude`, catálogo, configuração do mapa e sessão. Testes que gravam dados precisam de autorização e dados de teste identificados; não presumir que a base atual seja descartável.

## E-mail de teste

E-mail informado para uso nos testes: `silvaromulo33@gmail.com`. Não criar conta automaticamente, não gravar senha no repositório e não executar cadastro na produção sem autorização explícita.
