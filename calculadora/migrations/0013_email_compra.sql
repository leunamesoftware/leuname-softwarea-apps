-- E-mail com o link de instalar, depois da compra: quando saiu (auto pelo servidor ou manual pelo dono).
-- Vazio = ainda não foi: aparece na Área do Dono para mandar à mão.
ALTER TABLE pedidos ADD COLUMN email_enviado TEXT;
-- Compras de antes desta mudança não entram na lista.
UPDATE pedidos SET email_enviado = 'antes' WHERE status = 'pago';
