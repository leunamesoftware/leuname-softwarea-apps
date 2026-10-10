-- Loja nova criada pelo app Parceiro só aparece para os clientes depois que o administrador aprova (as que já existem ficam aprovadas).
ALTER TABLE empresas ADD COLUMN aprovada INTEGER NOT NULL DEFAULT 1;
