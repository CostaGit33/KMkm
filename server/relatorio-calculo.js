// Cálculo puro do relatório do piloto (sem banco): funil, sinais de decisão e texto. Testado em test/relatorio.test.js.
const DIA_MS = 86400000;

export const pct = (parte, total) => (total > 0 ? Math.round((parte / total) * 1000) / 10 : null);

// pessoas: [{ usuario_id, primeiro: Date, pontos, dias: [Date…] }]; rotas: [{ id, nome, total }]
// feitosPorRota: [{ rota_id, usuario_id, feitos }]
export function calcularFunil({ pessoas, rotas, feitosPorRota, contasCriadas, agora = new Date() }) {
  const participantes = pessoas.length;
  const segundoPonto = pessoas.filter((p) => Number(p.pontos) >= 2).length;
  const maduras = pessoas.filter((p) => agora - new Date(p.primeiro) >= 7 * DIA_MS);
  const voltaram = maduras.filter((p) => {
    const base = new Date(p.primeiro).setHours(0, 0, 0, 0);
    return p.dias.some((dia) => {
      const delta = Math.round((new Date(dia).setHours(0, 0, 0, 0) - base) / DIA_MS);
      return delta >= 1 && delta <= 7;
    });
  }).length;
  const ids = new Set(pessoas.map((p) => Number(p.usuario_id)));
  const concluidas = rotas.map((r) => {
    const gente = new Set(feitosPorRota.filter((f) => f.rota_id === r.id && ids.has(Number(f.usuario_id)) && Number(f.feitos) >= Number(r.total) && Number(r.total) > 0).map((f) => f.usuario_id));
    return { rota: r.nome, pontos: Number(r.total), pessoas: gente.size, taxa_pct: pct(gente.size, participantes) };
  });
  return {
    contas_criadas: Number(contasCriadas),
    participantes,
    taxa_primeiro_carimbo_pct: pct(participantes, Number(contasCriadas)),
    segundo_ponto: { pessoas: segundoPonto, taxa_pct: pct(segundoPonto, participantes) },
    retorno_7_dias: { elegiveis: maduras.length, voltaram, taxa_pct: pct(voltaram, maduras.length) },
    conclusao_por_rota: concluidas,
  };
}

// Regras de decisão do piloto (docs/riscos-piloto-eunapolis.md): quem fica abaixo de 30% em retorno ou em
// "mais de um ponto" aciona o gatilho de parada. Devolve avisos em português, nunca uma ordem automática.
export function avaliarSinais({ funil, prontidao, suspeitos }) {
  const sinais = [];
  if (funil.participantes < 20) sinais.push({ nivel: 'info', texto: `Só ${funil.participantes} participante(s): amostra pequena para decidir (meta do plano: 20 ou mais).` });
  if (funil.segundo_ponto.taxa_pct != null && funil.segundo_ponto.taxa_pct < 30) sinais.push({ nivel: 'alerta', texto: `Só ${funil.segundo_ponto.taxa_pct}% carimbaram mais de um ponto (gatilho de parada: abaixo de 30%).` });
  if (funil.retorno_7_dias.taxa_pct != null && funil.retorno_7_dias.taxa_pct < 30) sinais.push({ nivel: 'alerta', texto: `Só ${funil.retorno_7_dias.taxa_pct}% voltaram em até 7 dias (gatilho de parada: abaixo de 30%).` });
  if (prontidao.sem_autorizacao > 0) sinais.push({ nivel: 'alerta', texto: `${prontidao.sem_autorizacao} ponto(s) publicado(s) sem autorização registrada.` });
  if (prontidao.sem_vistoria > 0) sinais.push({ nivel: 'alerta', texto: `${prontidao.sem_vistoria} ponto(s) publicado(s) sem vistoria registrada.` });
  if (prontidao.sem_chave > 0) sinais.push({ nivel: 'aviso', texto: `${prontidao.sem_chave} ponto(s) publicado(s) com link aberto (sem chave).` });
  const totalSuspeitos = suspeitos.reduce((soma, s) => soma + Number(s.n), 0);
  if (totalSuspeitos > 0) sinais.push({ nivel: 'aviso', texto: `${totalSuspeitos} carimbo(s) marcado(s) como suspeito(s); revise antes de premiar ou pagar patrocinador.` });
  if (!sinais.some((s) => s.nivel === 'alerta')) sinais.push({ nivel: 'ok', texto: 'Nenhum gatilho de parada acionado nos dados disponíveis.' });
  return sinais;
}

export function relatorioEmTexto(r) {
  const f = r.funil;
  const linha = (rotulo, valor) => `${rotulo.padEnd(34)} ${valor}`;
  const taxa = (v) => (v == null ? '—' : `${v}%`);
  return [
    `RELATÓRIO DO PILOTO  (${r.periodo.de.slice(0, 10)} a ${r.periodo.ate.slice(0, 10)})`,
    '',
    linha('Contas criadas', f.contas_criadas),
    linha('Participantes (≥ 1 carimbo)', `${f.participantes}  (${taxa(f.taxa_primeiro_carimbo_pct)} das contas)`),
    linha('Carimbaram 2 ou mais pontos', `${f.segundo_ponto.pessoas}  (${taxa(f.segundo_ponto.taxa_pct)})`),
    linha('Voltaram em até 7 dias', `${f.retorno_7_dias.voltaram} de ${f.retorno_7_dias.elegiveis}  (${taxa(f.retorno_7_dias.taxa_pct)})`),
    ...f.conclusao_por_rota.map((c) => linha(`Concluíram “${c.rota}”`, `${c.pessoas}  (${taxa(c.taxa_pct)})`)),
    '',
    'PRONTIDÃO DOS PONTOS PUBLICADOS',
    linha('Publicados', r.prontidao.publicados),
    linha('Sem autorização registrada', r.prontidao.sem_autorizacao),
    linha('Sem vistoria registrada', r.prontidao.sem_vistoria),
    linha('Sem chave no link', r.prontidao.sem_chave),
    linha('Sem coordenada', r.prontidao.sem_coordenada),
    '',
    'CARIMBOS POR PONTO (acumulado)',
    ...r.pontos.map((p) => `  ${p.codigo.padEnd(10)} ${String(p.carimbos).padStart(5)} carimbos  ${String(p.pessoas).padStart(4)} pessoas  ${p.status}  ${p.nome}`),
    '',
    'SINAIS',
    ...r.sinais.map((s) => `  [${s.nivel}] ${s.texto}`),
    '',
    r.observacao,
  ].join('\n');
}
