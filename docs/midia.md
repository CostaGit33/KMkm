# Fotos dos pontos (galeria)

Cada ponto pode ter fotos atuais e históricas, guardadas num lugar único, tratadas pelo servidor e exibidas no app. O objetivo é preservar a memória visual do lugar e deixar quem visita comparar "antes" e "hoje". **Nada aqui usa IA para colorizar, "melhorar" ou inventar detalhes**; uma versão restaurada é sempre marcada como derivada de uma foto original.

## Como funciona
1. A administração envia a foto em **Admin → Pontos → Fotos** (ou por `scripts/midia.js importar`). Ela entra **pendente**: ninguém vê no app.
2. O servidor guarda o **original intacto** (com os dados da câmera) em `originais/<ponto>/<sha256>.<ext>` e gera duas cópias públicas em WebP, **sem EXIF/GPS/XMP**: 1400 px (`g`) e 320 px (`m`).
3. Um administrador revisa e **aprova**. Só então a foto aparece no app (faixa de fotos, ampliação e, havendo uma histórica e uma atual aprovadas, o comparador "Antes / Hoje").
4. O app lê `GET /api/pontos/:codigo/imagens` (só aprovadas) e baixa as cópias de `/midia/<id>.<hash16>.<g|m>.webp`. As URLs são imutáveis (cache de 1 ano). O bucket **não é público**: é o servidor que entrega.

Os metadados ficam na tabela `ponto_imagens` (título, legenda, período, tipo de registro, autor, fonte, hash, tamanhos, `derivada_de`, status, ordem). O original só sai por download de administrador.

## Regras
- **Tipos de registro:** `atual`, `historica`, `restauracao` (derivada de outra foto do mesmo ponto; aparece com o selo "versão restaurada") e `outra`.
- **Crédito:** foto `historica` ou `restauracao` só é aprovada com **autor ou fonte**. Aprovar sem crédito exige confirmação e fica na auditoria (`foto.aprovada_sem_credito`).
- **Direitos:** envie só o que a prefeitura, a paróquia ou o autor autorizou, ou o que é de sua autoria. Guarde a autorização fora do sistema.
- **Limites:** JPEG, PNG ou WebP; até 15 MB e 80 megapixels; lado menor de 400 px ou mais. SVG, GIF, TIFF e imagens animadas são recusados antes de qualquer leitura. A mesma foto não entra duas vezes no mesmo ponto (SHA-256).
- **Exclusão:** só de foto não aprovada; arquive antes. Os arquivos saem do armazenamento primeiro. Um ponto com fotos não pode ser excluído (arquive o ponto).
- **Sem localização:** o GPS das fotos nunca chega ao público. O original o preserva só para o acervo.

## Armazenamento (variáveis do servidor)
| Variável | Uso |
|---|---|
| `R2_ACCOUNT_ID` (ou `R2_ENDPOINT`) | conta Cloudflare (`https://<conta>.r2.cloudflarestorage.com`) |
| `R2_BUCKET` | `mais1km-media` |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | token S3 do R2 com **leitura e gravação só neste bucket** |
| `MEDIA_DIR` | alternativa: pasta de um **volume persistente** (sem R2). Sem isto, em produção as fotos ficam desligadas |

Criar o token: Cloudflare → R2 → *Manage API Tokens* → *Create API token* → permissão *Object Read & Write*, restrito ao bucket `mais1km-media`. Cole os valores **direto no Easypanel** (variáveis de execução); não os envie em chat, e-mail ou commit. Depois do deploy:

```
npm --prefix server run midia -- verificar
```
ou, no `/admin`, a aba de Fotos avisa se o armazenamento não está pronto. `/api/saude` mostra `midia` (`r2`, `local`, `desligado` ou `r2-incompleto`).

Sem armazenamento configurado o app continua normal; só o envio de fotos responde `503 midia_sem_armazenamento`.

## Console do servidor
```
npm --prefix server run midia -- verificar
npm --prefix server run midia -- listar [eu-015]
npm --prefix server run midia -- importar eu-015 /caminho/foto.jpg --tipo=atual --titulo="Matriz ao entardecer" --autor="..." --aprovar
npm --prefix server run midia -- importar eu-015 /caminho/antiga.jpg --tipo=historica --periodo="antes da reforma" --fonte="acervo ..." --aprovar
```

## Igreja Matriz (primeiro conteúdo)
- Foto atual (entardecer, torre): tipo `atual`, é também a arte da carta Comum (`client/public/cartas/matriz-comum.webp`, já no repositório).
- Foto da fachada antes da reforma: tipo `historica`, período "antes da reforma". Informe autor ou fonte antes de aprovar.
- Os originais **não** estão no repositório: envie-os pelo `/admin` depois do deploy.

## Segurança e backup
- Rotas de envio e de original exigem papel `admin`; envio limitado a 40 por 10 minutos por conta.
- Faça backup do bucket (ou do volume) junto com o do MySQL: a tabela só aponta para os arquivos.
- Teste ponta a ponta (cria e apaga dados de teste; só em ambiente local ou de homologação): `server/scripts/e2e-midia.mjs`. Para testar o R2 sem credenciais: `server/scripts/stub-s3.mjs`.
