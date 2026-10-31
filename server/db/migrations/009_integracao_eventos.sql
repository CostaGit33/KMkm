CREATE TABLE IF NOT EXISTS integracao_eventos (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  evento_id CHAR(36) NOT NULL,
  tipo VARCHAR(80) NOT NULL,
  payload JSON NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pendente',
  tentativas INT UNSIGNED NOT NULL DEFAULT 0,
  disponivel_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  bloqueado_ate DATETIME NULL,
  enviado_em DATETIME NULL,
  ultimo_erro VARCHAR(80) NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_integracao_eventos_id (evento_id),
  KEY idx_integracao_eventos_fila (status, disponivel_em, id),
  KEY idx_integracao_eventos_bloqueio (status, bloqueado_ate, id)
);
