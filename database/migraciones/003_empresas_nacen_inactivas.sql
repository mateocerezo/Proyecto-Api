-- Flujo multi-tenant: toda empresa nueva queda pendiente (activa = false)
-- hasta que la apruebe el SuperAdmin. El backend ya inserta activa = false
-- explícitamente; esto lo garantiza también para altas hechas a mano.
-- No modifica empresas existentes. Ejecutar una sola vez (SQL Editor de Supabase).

ALTER TABLE empresas ALTER COLUMN activa SET DEFAULT false;
