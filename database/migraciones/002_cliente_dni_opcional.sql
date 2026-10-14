-- El formulario público de consultas no pide DNI, pero clientes.dni era NOT NULL.
-- Lo vuelve opcional para poder registrar al cliente al recibir la consulta.
-- Ejecutar una sola vez (SQL Editor de Supabase).

ALTER TABLE clientes ALTER COLUMN dni DROP NOT NULL;
