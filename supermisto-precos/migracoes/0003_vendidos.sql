-- Corrige "7mil+ vendidos" lido como 7.000.000 nos primeiros prints.
UPDATE concorrentes SET vendidos = vendidos / 1000 WHERE vendidos > 2000000;
