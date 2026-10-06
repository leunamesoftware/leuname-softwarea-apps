-- Notas e avaliações dos apps e cursos da LeuApps (uma por conta em cada app; a pessoa pode editar).
-- escondida = 1: o dono tirou da página (comentário ofensivo). resposta: resposta do desenvolvedor.
CREATE TABLE IF NOT EXISTS avaliacoes (
  id TEXT PRIMARY KEY,
  app TEXT NOT NULL,
  conta_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  nota INTEGER NOT NULL CHECK (nota BETWEEN 1 AND 5),
  texto TEXT,
  criado_em TEXT NOT NULL,
  atualizado_em TEXT NOT NULL,
  escondida INTEGER NOT NULL DEFAULT 0,
  resposta TEXT,
  resposta_em TEXT,
  UNIQUE (app, conta_id)
);
CREATE INDEX IF NOT EXISTS avaliacoes_app ON avaliacoes (app, escondida, atualizado_em);

-- "Você achou este comentário útil?" (um voto por conta em cada avaliação).
CREATE TABLE IF NOT EXISTS avaliacoes_util (
  avaliacao_id TEXT NOT NULL,
  conta_id TEXT NOT NULL,
  util INTEGER NOT NULL,
  PRIMARY KEY (avaliacao_id, conta_id)
);
