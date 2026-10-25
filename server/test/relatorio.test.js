import test from 'node:test';
import assert from 'node:assert/strict';
import { avaliarSinais, calcularFunil, pct, relatorioEmTexto } from '../relatorio-calculo.js';

const agora = new Date('2026-11-20T12:00:00Z');
const dia = (n) => new Date(Date.UTC(2026, 10, n, 15, 0, 0));

test('pct arredonda a uma casa e devolve null sem denominador', () => {
  assert.equal(pct(1, 3), 33.3);
  assert.equal(pct(0, 5), 0);
  assert.equal(pct(1, 0), null);
});

test('funil: participantes, segundo ponto, retorno em 7 dias e conclusão por rota', () => {
  const pessoas = [
    { usuario_id: 1, primeiro: dia(1), pontos: 3, dias: [dia(1), dia(3)] },   // voltou no dia 3
    { usuario_id: 2, primeiro: dia(1), pontos: 1, dias: [dia(1)] },            // não voltou
    { usuario_id: 3, primeiro: dia(2), pontos: 2, dias: [dia(2), dia(15)] },   // voltou tarde demais (13 dias)
    { usuario_id: 4, primeiro: dia(19), pontos: 1, dias: [dia(19)] },          // ainda não elegível (1 dia)
  ];
  const f = calcularFunil({
    pessoas,
    rotas: [{ id: 10, nome: 'Eunápolis · Piloto', total: 3 }],
    feitosPorRota: [{ rota_id: 10, usuario_id: 1, feitos: 3 }, { rota_id: 10, usuario_id: 2, feitos: 1 }, { rota_id: 10, usuario_id: 99, feitos: 3 }],
    contasCriadas: 8,
    agora,
  });
  assert.equal(f.participantes, 4);
  assert.equal(f.taxa_primeiro_carimbo_pct, 50);
  assert.deepEqual(f.segundo_ponto, { pessoas: 2, taxa_pct: 50 });
  assert.deepEqual(f.retorno_7_dias, { elegiveis: 3, voltaram: 1, taxa_pct: 33.3 });
  // a pessoa 99 não é da coorte e não conta
  assert.deepEqual(f.conclusao_por_rota, [{ rota: 'Eunápolis · Piloto', pontos: 3, pessoas: 1, taxa_pct: 25 }]);
});

test('funil sem ninguém não divide por zero', () => {
  const f = calcularFunil({ pessoas: [], rotas: [], feitosPorRota: [], contasCriadas: 0, agora });
  assert.equal(f.participantes, 0);
  assert.equal(f.taxa_primeiro_carimbo_pct, null);
  assert.equal(f.retorno_7_dias.taxa_pct, null);
});

test('sinais: aciona o gatilho de parada (<30%), avisa sobre documentação, chave e suspeitos', () => {
  const funil = { participantes: 25, segundo_ponto: { pessoas: 5, taxa_pct: 20 }, retorno_7_dias: { elegiveis: 10, voltaram: 2, taxa_pct: 20 } };
  const sinais = avaliarSinais({ funil, prontidao: { sem_autorizacao: 2, sem_vistoria: 0, sem_chave: 3 }, suspeitos: [{ motivo: 'ritmo_alto', n: 4 }] });
  const textos = sinais.map((s) => `${s.nivel}:${s.texto}`).join('\n');
  assert.match(textos, /alerta:Só 20% carimbaram mais de um ponto/);
  assert.match(textos, /alerta:Só 20% voltaram em até 7 dias/);
  assert.match(textos, /alerta:2 ponto\(s\) publicado\(s\) sem autorização/);
  assert.match(textos, /aviso:3 ponto\(s\) publicado\(s\) com link aberto/);
  assert.match(textos, /aviso:4 carimbo\(s\) marcado\(s\) como suspeito/);
  assert.ok(!sinais.some((s) => s.nivel === 'ok'));
});

test('sinais: sem problemas, devolve ok; amostra pequena vira informação', () => {
  const funil = { participantes: 30, segundo_ponto: { pessoas: 20, taxa_pct: 66.7 }, retorno_7_dias: { elegiveis: 10, voltaram: 6, taxa_pct: 60 } };
  const limpo = avaliarSinais({ funil, prontidao: { sem_autorizacao: 0, sem_vistoria: 0, sem_chave: 0 }, suspeitos: [] });
  assert.deepEqual(limpo.map((s) => s.nivel), ['ok']);
  const pequeno = avaliarSinais({ funil: { ...funil, participantes: 5 }, prontidao: { sem_autorizacao: 0, sem_vistoria: 0, sem_chave: 0 }, suspeitos: [] });
  assert.equal(pequeno[0].nivel, 'info');
});

test('relatório em texto traz as seções principais', () => {
  const f = { contas_criadas: 3, participantes: 2, taxa_primeiro_carimbo_pct: 66.7, segundo_ponto: { pessoas: 1, taxa_pct: 50 }, retorno_7_dias: { elegiveis: 0, voltaram: 0, taxa_pct: null }, conclusao_por_rota: [] };
  const texto = relatorioEmTexto({
    periodo: { de: '2026-11-01T00:00:00.000Z', ate: '2026-11-15T00:00:00.000Z' }, funil: f,
    prontidao: { publicados: 1, sem_autorizacao: 0, sem_vistoria: 0, sem_chave: 1, sem_coordenada: 0 },
    pontos: [{ codigo: 'eu-001', nome: 'Praça da Bandeira', status: 'publicado', carimbos: 4, pessoas: 2 }],
    sinais: [{ nivel: 'ok', texto: 'Nenhum gatilho de parada acionado nos dados disponíveis.' }], observacao: 'obs',
  });
  for (const trecho of ['RELATÓRIO DO PILOTO', 'Participantes', 'PRONTIDÃO DOS PONTOS PUBLICADOS', 'CARIMBOS POR PONTO', 'SINAIS', 'eu-001']) assert.ok(texto.includes(trecho), trecho);
});
