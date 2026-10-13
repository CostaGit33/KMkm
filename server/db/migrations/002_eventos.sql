CREATE TABLE IF NOT EXISTS patrocinadores (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL UNIQUE,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS eventos (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(80) NOT NULL UNIQUE,
  nome VARCHAR(160) NOT NULL,
  tipo VARCHAR(16) NOT NULL DEFAULT 'evento',
  descricao VARCHAR(400) NULL,
  patrocinador_id INT NULL,
  inicio_em DATETIME NOT NULL,
  fim_em DATETIME NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'rascunho',
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT eventos_patrocinador_fk FOREIGN KEY (patrocinador_id) REFERENCES patrocinadores(id)
);
CREATE TABLE IF NOT EXISTS evento_tags (
  evento_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (evento_id, tag_id),
  CONSTRAINT evento_tags_evento_fk FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE CASCADE,
  CONSTRAINT evento_tags_tag_fk FOREIGN KEY (tag_id) REFERENCES tags(id)
)
