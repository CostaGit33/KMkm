CREATE TABLE IF NOT EXISTS recuperacao_senha_tokens (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  conta_id INT NOT NULL,
  token_hash BINARY(32) NOT NULL UNIQUE,
  ip_hash BINARY(32) NULL,
  expira_em DATETIME NOT NULL,
  usado_em DATETIME NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_recuperacao_conta_criado (conta_id, criado_em),
  KEY idx_recuperacao_expira (expira_em),
  CONSTRAINT recuperacao_senha_conta_fk FOREIGN KEY (conta_id) REFERENCES contas(id) ON DELETE CASCADE
);
