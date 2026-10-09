-- Cliente do app pode cancelar nos primeiros minutos do pedido (a loja só marca "pronto" depois desse prazo).
ALTER TABLE pedidos_online ADD COLUMN cancelado_em TEXT;
