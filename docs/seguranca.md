# Segurança do +1 KM: o que cada camada garante

Este documento diz o que está protegido, **o que não está** e como operar. Escrito para quem administra o piloto, sem exigir conhecimento técnico profundo.

## 1. Carimbo: quatro camadas, com limites honestos

| Camada | O que impede | O que **não** impede |
|---|---|---|
| **Chave no link** (`/t/eu-001?k=…`) | Adivinhar códigos (`eu-001`, `eu-002`…) e carimbar de longe sem nunca ter visto a tag. Girar a chave revoga links vazados. | Quem fotografa o QR ou lê a tag NFC tem o link e pode compartilhá-lo. |
| **Localização** (raio por ponto) | Carimbar a quilômetros do ponto. A coordenada não é guardada. | GPS pode ser falsificado; exige coordenada conferida em campo; GPS ruim em ambiente fechado gera falso bloqueio (precisão pior que 50 m é recusada). Ligado sempre: raio padrão e máximo de 100 m; ponto sem coordenada não carimba. |
| **Marcação de suspeitos** | Não bloqueia; **registra** deslocamento impossível entre dois pontos e ritmo alto, para revisão antes de premiar ou prestar contas a patrocinador. | Fraude lenta e plausível. |
| **Limite de ritmo** | Mais de 15 carimbos novos em 10 minutos são bloqueados. | Fraude em ritmo humano. |

**Prova de presença de verdade** só existe com tag de contador assinado (NTAG 424 DNA): cada leitura gera um código único que o servidor valida. Isso **não está implementado**. Se o patrocinador pagar por visita comprovada, esse é o próximo passo técnico (e muda a compra das tags).

### Rotina com as chaves
1. Defina `TAG_KEY_SECRET` (32+ caracteres) e guarde uma cópia fora do servidor. Sem o segredo, os links já gravados deixam de funcionar.
2. `npm --prefix server run chaves -- ativar-todos`, depois `... urls` (ou *Admin → Exportar links (CSV)*). Grave nas tags e gere os QR com esses links.
3. Tag perdida, QR vazado ou troca de etiqueta: *Admin → Link da tag → Girar chave* e regrave **só aquela** tag.
4. O CSV de links contém as chaves: trate como senha (não envie por mensagem aberta, não suba em pasta pública).

## 2. Conta e sessão
- Senha com scrypt; sessão guardada como hash; cookie HttpOnly, `SameSite=Lax`, `Secure` em HTTPS.
- Trocar e-mail ou senha exige a **senha atual** e encerra as outras sessões.
- Login: limite por IP **e por e-mail**; tempo de resposta igual para e-mail inexistente; no máximo 10 sessões por conta; "sair" encerra só a sessão atual.
- Pedidos que alteram dados só valem vindos do próprio site (verificação de origem).
- Recuperação de senha por e-mail (Resend), link de uso único e curto.

## 3. Política de conteúdo (CSP)
Scripts só do próprio site, Google Maps e GA4; **sem** script embutido nem `eval`. Estilos embutidos ainda são aceitos (o mapa e o HTML do app dependem disso). Ninguém pode embutir o app em iframe (`frame-ancestors 'self'`). Se uma tela quebrar após o deploy, `CSP_LEGADO=true` reabre o script embutido enquanto se corrige; volte para `false` depois.

## 4. Limites conhecidos (não resolvidos)
- Limite de tentativas fica em memória: vale para uma instância só e zera a cada reinício.
- O app guarda no aparelho uma cópia do hash da senha (para conferir a senha atual na tela de perfil). Planejado: remover e conferir só no servidor.
- Sem teste automatizado de ponta a ponta (login → carimbar → outro aparelho).
- O fluxo anônimo da página da tag cria contas sem e-mail; há limite por IP, mas não há limpeza automática de contas anônimas antigas.
- Backup e restauração do banco precisam ser **testados** (checklist de deploy).

## 5. Se algo der errado
- **Suspeita de fraude num ponto:** despublique o ponto (Admin → Despublicar), gire a chave, revise os carimbos marcados como suspeitos (aba *Piloto*), reative.
- **Vazamento do `TAG_KEY_SECRET`:** troque o segredo e reexporte/regrave todas as tags.
- **Tela quebrada após deploy:** `CSP_LEGADO=true`, depois corrija e desligue.
