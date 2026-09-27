-- Carga inicial de categorias (mesmas da Fase 4 do app).
INSERT OR IGNORE INTO categories (id, name, icon, order_index, active) VALUES
  ('moveis', 'Móveis', 'moveis', 0, 1),
  ('eletronicos', 'Eletrônicos', 'eletronicos', 1, 1),
  ('moda', 'Moda', 'moda', 2, 1),
  ('games', 'Games', 'games', 3, 1),
  ('casa', 'Casa e Decoração', 'casa', 4, 1),
  ('esportes', 'Esportes', 'esportes', 5, 1),
  ('veiculos', 'Veículos', 'veiculos', 6, 1),
  ('pets', 'Pets', 'pets', 7, 1),
  ('beleza', 'Beleza', 'beleza', 8, 1),
  ('ferramentas', 'Ferramentas', 'ferramentas', 9, 1),
  ('brinquedos', 'Brinquedos', 'brinquedos', 10, 1),
  ('outros', 'Outros', 'outros', 11, 1);
