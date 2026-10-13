-- Rota piloto de Eunápolis: 8 pontos. Todos nascem 'pendente' e só viram 'publicado'
-- depois da validação em campo (node scripts/pontos.js publicar <codigo>).
INSERT IGNORE INTO rotas (nome, tipo, cor, km, cidade_id, status)
VALUES ('Eunápolis · Piloto', 'cidade', 'folha', NULL, 'eunapolis', 'publicado');
INSERT IGNORE INTO tags (codigo, rota_id, ordem, nome, forma, parceiro, status)
SELECT 'eu-001', id, 1, 'Praça da Bandeira', 'c', FALSE, 'pendente' FROM rotas WHERE nome = 'Eunápolis · Piloto';
INSERT IGNORE INTO tags (codigo, rota_id, ordem, nome, forma, parceiro, status)
SELECT 'eu-002', id, 2, 'Praça da Liberdade', 'r', FALSE, 'pendente' FROM rotas WHERE nome = 'Eunápolis · Piloto';
INSERT IGNORE INTO tags (codigo, rota_id, ordem, nome, forma, parceiro, status)
SELECT 'eu-003', id, 3, 'Parque Ecológico do Gravatá', 'c', FALSE, 'pendente' FROM rotas WHERE nome = 'Eunápolis · Piloto';
INSERT IGNORE INTO tags (codigo, rota_id, ordem, nome, forma, parceiro, status)
SELECT 'eu-004', id, 4, 'Praça do Pequi', 'r', FALSE, 'pendente' FROM rotas WHERE nome = 'Eunápolis · Piloto';
INSERT IGNORE INTO tags (codigo, rota_id, ordem, nome, forma, parceiro, status)
SELECT 'eu-007', id, 5, 'Praça Dona Dinah Borges Moura', 'c', FALSE, 'pendente' FROM rotas WHERE nome = 'Eunápolis · Piloto';
INSERT IGNORE INTO tags (codigo, rota_id, ordem, nome, forma, parceiro, status)
SELECT 'eu-008', id, 6, 'Lagoa e Academia da Saúde do Dinah Borges', 'r', FALSE, 'pendente' FROM rotas WHERE nome = 'Eunápolis · Piloto';
INSERT IGNORE INTO tags (codigo, rota_id, ordem, nome, forma, parceiro, status)
SELECT 'eu-009', id, 7, 'Mercado Municipal Dona Alzira', 'c', FALSE, 'pendente' FROM rotas WHERE nome = 'Eunápolis · Piloto';
INSERT IGNORE INTO tags (codigo, rota_id, ordem, nome, forma, parceiro, status)
SELECT 'eu-011', id, 8, 'Viola de Bolso Arte e Memória', 'r', FALSE, 'pendente' FROM rotas WHERE nome = 'Eunápolis · Piloto';
