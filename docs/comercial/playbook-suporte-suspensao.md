# Playbook de suporte e suspensão do piloto

**Plantão:** [nome] · **Canal único:** [WhatsApp/e-mail] · **Resposta:** em até **[4 h úteis]** durante o piloto; **[1 dia útil]** para retirar/suspender ponto.

## Incidentes comuns

| Situação | Primeira ação | Depois |
|---|---|---|
| Tag não lê / sumiu | Orientar o visitante a usar o QR de reserva | Substituir tag; se o link vazou, *Admin → Link da tag → Girar chave* e regravar |
| "Este link da tag não confere" | Confirmar se a tag foi regravada/trocada | Girar e regravar, ou reativar a chave certa |
| "Ponto indisponível" | Ver se o ponto está publicado no `/admin` | Publicar (com documentação) ou explicar ao visitante |
| Responsável pede retirada | **Despublicar na hora** (Admin → Despublicar) | Retirar a tag em até [__] dias; registrar o motivo |
| Local mudou/fechou/reformou | Despublicar | Revistoriar antes de voltar |
| Carimbos suspeitos (aba *Piloto*) | Revisar quem e quando; não premiar nem repassar a patrocinador até conferir | Girar chave do ponto; se for padrão, ligar localização (raio) naquele ponto |
| Reclamação de dados/privacidade | Responder em até [2] dias úteis pelo contato da política | Para exclusão, `/excluir-conta` ou pedir ao admin |
| Carimbo "confirmado" que não aparece em outro aparelho | Pedir para entrar na conta (e-mail/senha) no aparelho novo | Se persistir, registrar `request_id` do erro e olhar o Sentry |
| Site fora do ar | Conferir `/api/saude` e o monitor | Reiniciar o serviço; se for CSP após deploy, `CSP_LEGADO=true` |

## Gatilhos de parada (decidir em reunião, por escrito)
Pare ou reduza o piloto se ocorrer **qualquer um**:
1. Ponto publicado **sem autorização** (despublique até regularizar).
2. Divergência de endereço/coordenada/horário que leve visitante ao lugar errado.
3. Rota ou ponto **inseguro** (tráfego, travessia, escuridão) apontado por alguém.
4. Pico anormal de carimbos num ponto ou uso simultâneo incompatível (veja suspeitos).
5. Visitante recebeu "concluído" sem confirmação do servidor.
6. Abaixo de **30%** de participantes com mais de um ponto, **ou** abaixo de 30% de retorno em 7 dias, com 20 ou mais participantes (aba *Piloto*).
7. Nenhum comprador ou patrocinador mantém interesse ao fim do período.

## Registro
Cada incidente: data, ponto, o que houve, quem agiu, quanto demorou, o que mudou. Revise toda semana com o comprador. Os eventos do `/admin → Registro` já guardam publicações, despublicações, chaves e exportações.
