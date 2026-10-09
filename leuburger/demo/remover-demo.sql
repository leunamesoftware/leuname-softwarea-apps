-- Apaga TODAS as lojas de demonstração  e seus dados.
DELETE FROM avaliacoes WHERE empresa_id IN (SELECT id FROM empresas WHERE conta_email LIKE 'demo-%@leupede.demo');
DELETE FROM pedidos_online WHERE empresa_id IN (SELECT id FROM empresas WHERE conta_email LIKE 'demo-%@leupede.demo');
DELETE FROM produtos WHERE empresa_id IN (SELECT id FROM empresas WHERE conta_email LIKE 'demo-%@leupede.demo');
DELETE FROM categorias WHERE empresa_id IN (SELECT id FROM empresas WHERE conta_email LIKE 'demo-%@leupede.demo');
DELETE FROM fotos WHERE empresa_id IN (SELECT id FROM empresas WHERE conta_email LIKE 'demo-%@leupede.demo');
DELETE FROM caixas WHERE empresa_id IN (SELECT id FROM empresas WHERE conta_email LIKE 'demo-%@leupede.demo');
DELETE FROM usuarios WHERE empresa_id IN (SELECT id FROM empresas WHERE conta_email LIKE 'demo-%@leupede.demo');
DELETE FROM empresas WHERE conta_email LIKE 'demo-%@leupede.demo';
