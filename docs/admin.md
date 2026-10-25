# Administração do +1 KM (V8.4)

Página: **`https://SEU-DOMINIO/admin`** — adicionar, remover e organizar pontos, rotas, circuitos, eventos/patrocínios e pessoas, sem mexer no banco nem no código.

## 1. Como virar administrador (uma vez)

1. Crie sua conta pelo próprio app (Perfil → criar conta). Use um e-mail e uma senha que só você conhece.
2. No **Console** do serviço no Easypanel, rode:
   ```
   node server/scripts/admin.js promover SEU@EMAIL
   ```
   Outros comandos: `listar` (quem é admin) e `rebaixar <email>`.
3. Abra `/admin` e entre com essa conta. Quem não é admin vê "Sem permissão" e a API responde 403.

Depois de ter o primeiro admin, ele pode promover outras pessoas na aba **Pessoas**.

## 2. O que cada aba faz

| Aba | O que dá para fazer |
| --- | --- |
| **Pontos** | Criar, editar (nome, categorias, coordenadas, endereço, descrição, ícone, formato do carimbo, ponto-surpresa), **publicar / despublicar / arquivar / excluir**, mover de rota e **arrastar para ordenar** (a ordem numera os carimbos). Cole `-16.37, -39.58` do Google Maps no campo de latitude e os dois campos se preenchem. |
| **Rotas** | **Circuitos**: o que aparece em "Rotas" no app. Cada um é uma lista ordenada de pontos (um ponto pode estar em vários); arraste para ordenar. **Rotas de carimbo**: o grupo que decide o certificado (carimbar todos os pontos da rota). |
| **Eventos** | Cards de evento e de patrocínio (janela de datas em horário da Bahia, 6 a 8 pontos para patrocínio, um card por ponto por vez), publicar, cancelar, relatório agregado e patrocinadores. |
| **Pessoas** | Buscar, ver carimbos, tornar/remover admin, excluir conta (pede para digitar EXCLUIR). |
| **Registro** | Quem fez o quê e quando (últimas 200 ações). |

## 3. Regras de segurança do histórico

- **Nada que já tem carimbo de alguém é apagado.** Ponto com carimbo: arquive ou despublique. Card com carimbos: só nome e descrição mudam (mudar janela ou pontos falsearia o relatório), e ele não pode ser excluído.
- Ponto em evento ainda aberto não pode ser arquivado nem excluído.
- Ponto **pendente** não recebe carimbo. Publique só depois de validar em campo (coordenada, acesso, segurança, autorização de quem cuida do espaço).
- O relatório de patrocinador mostra `<5` para contagens pequenas e nunca traz nome, apelido ou e-mail.
- Você não consegue mudar o próprio papel nem excluir a própria conta; admin precisa ser rebaixado antes de ser excluído.

## 4. Como o app enxerga o que você edita

O app lê `/api/catalogo` ao abrir. O que você cria, renomeia, arquiva ou reordena no admin aparece no mapa, nas listas e nos circuitos na próxima abertura do app (sem rede, o aparelho usa a última cópia guardada). Pontos arquivados somem do app; os carimbos antigos ficam guardados.

- A numeração dos pontos no mapa segue o **código** (eu-001, eu-002…). Para um ponto novo entrar no fim, use o próximo número (o formulário já sugere).
- O catálogo antigo que vivia dentro do app (18 pontos, 4 circuitos) foi **importado uma única vez** para o banco na primeira subida da V8.4. Depois disso o banco manda: o que foi apagado no admin não volta no próximo deploy.

## 5. Atualizando uma instalação que já está no ar

1. **Faça backup do banco** (dump do MySQL) antes de subir. A V8.4 cria colunas e tabelas novas e importa o catálogo (não apaga nem altera carimbos, contas ou eventos).
2. Substitua o conteúdo do repositório pelo da V8.4 (raiz com `Dockerfile`, `server/`, `client/`) e faça o deploy.
3. O log deve mostrar `Caderneta no ar na porta 3000`. Confira `/api/saude` e `/api/catalogo`.
4. Promova sua conta (item 1) e abra `/admin`.

## 6. Cuidados

- O admin mostra e-mails das pessoas. Use só para suporte e não compartilhe prints (LGPD).
- Use HTTPS e uma senha forte e exclusiva na conta de admin. Não há verificação de e-mail no cadastro: **crie sua conta antes de divulgar o app** para ninguém registrar o seu e-mail primeiro.
- A página `/admin` só é uma tela: quem protege os dados é a API (papel `admin` checado no servidor a cada requisição).

## 7. Novidades de segurança e operação (V8.13)
- **Editar ponto → Operação e segurança:** responsável, contato, data da autorização e da vistoria, e raio de localização. Publicar exige responsável + autorização + vistoria; sem isso o admin pergunta se quer publicar mesmo assim e a decisão fica no *Registro*.
- **Link da tag:** ativa, gira ou desativa a chave (`?k=`) do link do ponto e mostra o link para gravar na tag/QR. **Exportar links (CSV)** gera todos de uma vez; **Ativar chave em todos** liga a chave nos pontos que ainda têm link aberto. Veja `docs/seguranca.md`.
- **Aba Piloto:** funil (primeiro carimbo, segundo ponto, retorno em 7 dias, conclusão), prontidão dos pontos, carimbos por ponto, suspeitos e os sinais de parada.
- Variáveis novas: `TAG_KEY_SECRET`, `APP_PUBLIC_URL` (para o CSV), `GEOFENCE_RAIO_PADRAO_M`, `EXIGIR_AUTORIZACAO`.
