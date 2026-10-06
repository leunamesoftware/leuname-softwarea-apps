-- Denúncias de comentários da LeuApps (uma por conta em cada comentário). O dono vê na Área do Dono.
CREATE TABLE IF NOT EXISTS avaliacoes_denuncias (
  avaliacao_id TEXT NOT NULL,
  conta_id TEXT NOT NULL,
  motivo TEXT NOT NULL,
  criado_em TEXT NOT NULL,
  PRIMARY KEY (avaliacao_id, conta_id)
);
