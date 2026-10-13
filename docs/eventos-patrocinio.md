# Eventos e patrocínios (cards)

Implementa a proposta "cards e carimbos patrocinados" de 10/10/2026 sobre a V3 (caderneta_3).

## Regras

- **Rota diária não depende de card.** O carimbo da rota continua igual (`carimbos.evento_id IS NULL`), com a janela de 30 minutos de repetição. O certificado conta só carimbos da rota.
- **Card = janela de datas + conjunto de pontos.** Tabelas `eventos`, `evento_tags` e `patrocinadores` (migração `002_eventos.sql`); `carimbos.evento_id` marca o carimbo do card.
- **Um toque, até dois carimbos.** `POST /api/tags/:codigo/carimbar` grava o carimbo da rota e, se houver card publicado e dentro da janela naquele ponto, o carimbo do card. A resposta traz `evento` com `patrocinado_por`.
- **Janela em UTC.** O servidor compara `UTC_TIMESTAMP()` com `inicio_em`/`fim_em` (início inclusivo, fim exclusivo). O cadastro recebe hora da Bahia e converte.
- **Fora da janela.** `POST /api/eventos/:slug/carimbar {codigo}` responde 409 (`evento_nao_comecou`, `fora_da_janela` ou `ponto_fora_do_evento`) sem mexer na rota. No toque normal, fora da janela só vale a rota.
- **Um carimbo de card por pessoa, ponto e card** (índice único). Tocar de novo devolve `repetido: true`. O carimbo de rota recente não bloqueia o do card, e vice-versa.
- **Exclusividade.** Um ponto só pode ter um card (evento ou patrocínio, não cancelado) por período; o cadastro recusa sobreposição. Isso mantém "até dois carimbos" verdadeiro. O ponto continua na rota.
- **Patrocínio** exige patrocinador e de 6 a 8 pontos. O card mostra "Patrocinado por X" (texto vindo do servidor).
- **Só pontos publicados** entram em card (pontos `pendente`, como os do piloto de Eunápolis até serem publicados com `scripts/pontos.js`, são recusados).
- **Caderneta.** `/api/caderneta` devolve `rotas` (só `evento_id IS NULL`) e `eventos` (publicados; os encerrados só aparecem para quem tem carimbo neles). Estados: `em_breve`, `ao_vivo`, `encerrado` ("Coleção encerrada"). Cancelar um card não apaga carimbos já dados.
- **Excluir conta** apaga também os carimbos de cards.

## Cadastro (sem tela administrativa)

`node server/scripts/evento.js` (ou `npm --prefix server run evento -- ...`): `criar`, `publicar`, `cancelar`, `listar`, `relatorio <slug>`. O cadastro valida tipo, datas, tags, pontos publicados e conflito de janela. Não há papel de administrador no servidor, então não existe endpoint de cadastro: quem tem acesso ao banco/servidor roda o script.

## Relatório para patrocinador

`relatorio <slug>` devolve contagens agregadas (carimbos, pessoas, coleção completa, por ponto e por dia na Bahia), sem nome, apelido, e-mail ou id. Contagens abaixo de `RELATORIO_MIN` (padrão 5) aparecem como `<5`. Isso reduz, mas não elimina, o risco de reidentificação em pontos com pouco movimento: revise o relatório com o patrocinador antes de enviar.

## Decisões a confirmar

- A coluna `tags.tipo` da proposta não foi criada: `evento_tags` já diz quais tags participam de um card, e uma tag "especial" fora da rota não tem onde morar (`tags.rota_id` é obrigatório).
- Sobreposição de qualquer card no mesmo ponto é proibida (a proposta só falava de patrocínio).
- Pré-requisito para vender patrocínio como "presença comprovada": NTAG 424 DNA ou outro segundo fator. Com NTAG213 o link pode ser copiado e carimbado de casa dentro da janela.
- "Publicidade identificada" e LGPD: validar com profissional.
