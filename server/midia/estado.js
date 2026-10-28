// Destino de mídia único do processo (R2 em produção). Os testes podem trocá-lo.
import { criarArmazenamento } from './armazenamento.js';

let atual = criarArmazenamento();
export const armazenamentoDeMidia = () => atual;
export const trocarArmazenamento = (novo) => { const anterior = atual; atual = novo; return anterior; };
