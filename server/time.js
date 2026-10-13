// Início do dia no fuso local (padrão: Bahia), devolvido como Date em UTC.
// O banco guarda UTC; "hoje" para a pessoa começa à meia-noite do fuso dela, não do servidor.
function deslocamentoMs(fuso, instante) {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: fuso, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(instante);
  const v = Object.fromEntries(partes.map((p) => [p.type, Number(p.value)]));
  return Date.UTC(v.year, v.month - 1, v.day, v.hour, v.minute, v.second) - Math.floor(instante.getTime() / 1000) * 1000;
}

export function inicioDoDiaLocal(fuso = 'America/Bahia', agora = new Date()) {
  const local = new Date(agora.getTime() + deslocamentoMs(fuso, agora));
  const meiaNoiteComoUtc = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  let tentativa = new Date(meiaNoiteComoUtc - deslocamentoMs(fuso, agora));
  // segunda passada: o deslocamento pode mudar entre agora e a meia-noite (horário de verão)
  tentativa = new Date(meiaNoiteComoUtc - deslocamentoMs(fuso, tentativa));
  return tentativa;
}

// Converte "2026-11-01 08:00" (hora local no fuso informado) para o instante UTC correspondente.
export function instanteLocal(texto, fuso = 'America/Bahia') {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/.exec(String(texto || '').trim());
  if (!m) return null;
  const [, a, mes, d, h, min] = m.map(Number);
  const comoUtc = Date.UTC(a, mes - 1, d, h, min);
  const confere = new Date(comoUtc);
  if (confere.getUTCMonth() !== mes - 1 || confere.getUTCDate() !== d || h > 23 || min > 59) return null;
  let t = new Date(comoUtc - deslocamentoMs(fuso, new Date(comoUtc)));
  t = new Date(comoUtc - deslocamentoMs(fuso, t));
  return t;
}
