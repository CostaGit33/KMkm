# Integração de eventos do Mais1km com n8n e Telegram

## Arquitetura

A API continua sendo a fonte da verdade. Ela grava os eventos na tabela `integracao_eventos` e um worker envia os registros ao webhook HTTPS do n8n. A entrega usa tentativas automáticas com backoff exponencial; depois de 12 tentativas sem sucesso, o evento fica com status `falhou` para inspeção.

O n8n recebe o evento e envia a notificação pelo Telegram. Nenhuma regra de autenticação, geofence, pontuação ou concessão de carimbo é executada no n8n.

## Eventos enviados

| Tipo | Quando ocorre | Dados enviados |
|---|---|---|
| `account.created` | Conta criada com sucesso | canal de cadastro |
| `stamp.created` | Novo carimbo de rota confirmado | código/nome do ponto e rota |
| `event.stamp.created` | Novo carimbo de evento confirmado | evento e ponto |
| `security.stamp_suspicious` | A API identifica padrão suspeito | ponto, motivo e origem |

Eventos repetidos não geram notificação de novo carimbo. E-mail, nome de usuário, token, cookie e coordenadas GPS não são enviados.

## 1. Criar o webhook no n8n

1. Crie um workflow chamado **Mais1km · Eventos API → Telegram**.
2. Adicione um nó **Webhook**:
   - HTTP Method: `POST`
   - Path: `mais1km-eventos`
   - Authentication: `Header Auth`
   - Header Name: `X-Mais1km-Secret`
   - Header Value: o mesmo segredo configurado no serviço da API.
   - Respond: `When Last Node Finishes` (assim a API só considera entregue depois que o Telegram concluir o envio)
3. Copie a **Production URL** do Webhook. Não use a URL de teste.
4. Adicione um nó **Code** depois do Webhook, em modo *Run Once for All Items*, com o código:

```javascript
return $input.all().flatMap((item) => {
  const evento = item.json.body ?? item.json;
  const dados = evento.data ?? {};
  const id = String(evento.id ?? '').slice(0, 8);

  const mensagens = {
    'account.created': () => '🆕 Nova conta criada no Mais1km.',
    'stamp.created': () =>
      `📍 Novo carimbo: ${dados.point_name ?? dados.point_code ?? 'ponto'} (${dados.point_code ?? 'sem código'})\nRota: ${dados.route_name ?? 'não informada'}`,
    'event.stamp.created': () =>
      `🎟️ Carimbo de evento: ${dados.event_name ?? dados.event_slug ?? 'evento'}\nPonto: ${dados.point_name ?? dados.point_code ?? 'ponto'} (${dados.point_code ?? 'sem código'})`,
    'security.stamp_suspicious': () =>
      `⚠️ ATENÇÃO · Carimbo suspeito\nPonto: ${dados.point_name ?? dados.point_code ?? 'ponto'} (${dados.point_code ?? 'sem código'})\nMotivo: ${dados.reason ?? 'não informado'}\nOrigem: ${dados.origin ?? 'rota'}`,
  };

  const montar = mensagens[evento.type];
  if (!montar) return [];
  return [{ json: { text: `${montar()}\nEvento: ${id || 'sem id'}` } }];
});
```

5. Adicione o nó **Telegram → Send Message**:
   - Selecione a credencial do bot que você já utiliza.
   - Chat ID: ID do grupo ou conversa administrativa.
   - Text: `={{ $json.text }}`
6. Conecte Code → Telegram, salve e ative o workflow.

O webhook deve responder HTTP 2xx assim que aceitar a chamada. A opção **When Last Node Finishes** mantém a chamada aberta até o nó Telegram terminar. Se o envio falhar, a API recebe uma resposta de erro e tenta entregar o evento novamente.

## 2. Configurar o serviço da API no EasyPanel

Gere um segredo novo (não reutilize token do bot):

```bash
openssl rand -hex 32
```

Adicione no serviço que executa a API:

| Variável | Valor |
|---|---|
| `N8N_EVENTS_WEBHOOK_URL` | Production URL copiada do webhook |
| `N8N_EVENTS_SECRET` | segredo aleatório de 64 caracteres hexadecimais |

As duas variáveis são segredos/configuração de execução. Não as coloque em Build Args, no frontend, no GitHub ou em URLs públicas. Configure a credencial Header Auth do n8n com o mesmo valor de `N8N_EVENTS_SECRET`.

Reimplante o serviço da API. No log deve aparecer:

```json
{"type":"integration_event_worker","status":"ligado"}
```

Se o n8n estiver indisponível, os eventos permanecem na fila e serão tentados novamente.

## 3. Teste controlado

Depois de ativar o workflow e configurar as variáveis, gere um evento de teste diretamente no servidor da API:

```bash
node --input-type=module -e "import('./server/integracoes/eventos-n8n.js').then(m => m.registrarEvento('account.created', { canal: 'teste_manual' }))"
```

Aguarde alguns segundos e confira a execução do workflow e a mensagem no Telegram. Esse teste gera uma notificação identificada como conta criada para teste.

## 4. Diagnóstico

- `integracao_eventos.status = 'pendente'`: aguardando envio ou nova tentativa.
- `integracao_eventos.status = 'processando'`: em envio; um bloqueio de 60 segundos permite recuperar uma execução interrompida.
- `integracao_eventos.status = 'enviado'`: o webhook respondeu HTTP 2xx.
- `integracao_eventos.status = 'falhou'`: 12 tentativas sem sucesso; requer inspeção.

O status `enviado` confirma que o webhook do n8n aceitou a chamada, não que o Telegram entregou a mensagem. Verifique a execução do workflow para confirmar a etapa Telegram.

Para consultar a fila no MySQL:

```sql
SELECT tipo, status, tentativas, ultimo_erro, criado_em, enviado_em
FROM integracao_eventos
ORDER BY id DESC
LIMIT 30;
```

## 5. Operação e limites

- **Ritmo:** um evento a cada 3 s (`N8N_EVENTS_PAUSA_MS`, padrão 3000), para ficar abaixo de cerca de 20 mensagens por minuto por grupo do Telegram. Depois de uma queda, a fila drena nesse ritmo.
- **Entrega ao menos uma vez:** se o n8n demorar mais de 20 s, a API repete a chamada e a mensagem pode chegar em dobro. Cada evento tem `id` fixo (corpo e cabeçalho `X-Event-Id`); deduplique por ele no workflow se isso incomodar.
- **Datas:** `occurred_at` é a hora do evento; `sent_at`, a do envio. Redirecionamentos do webhook são recusados (o segredo não vai para outro destino).
- **Falhas:** após 12 tentativas (cerca de 2,4 h) o evento fica `falhou`. Com o n8n de volta: `npm --prefix server run eventos-fila -- status` e `... -- reenfileirar`.
- **Limpeza:** eventos `enviado` com mais de 30 dias são apagados automaticamente.
- **Monitoramento:** `/api/saude` traz `integracao: { configurado, pendentes, falhou, atraso_s }`. Alerte no Better Stack se `atraso_s` passar de alguns minutos ou `falhou` for maior que 0.

