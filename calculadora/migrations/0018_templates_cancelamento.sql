-- Compra de template estornada/contestada: a licença deixa de valer (o site do cliente mostra "sem licença").
ALTER TABLE template_licencas ADD COLUMN revogada TEXT;
