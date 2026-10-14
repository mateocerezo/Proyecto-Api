-- Corrige las columnas de fecha que quedaron creadas como TIME (solo hora).
-- En el diseño figuraban como "datetime", que no existe en PostgreSQL;
-- el tipo correcto es TIMESTAMP.
--
-- Es seguro aunque haya datos: a los valores existentes les asigna la fecha de hoy
-- (CURRENT_DATE + hora). Ejecutar una sola vez (SQL Editor de Supabase).

BEGIN;

ALTER TABLE empresas
  ALTER COLUMN fecha_alta DROP DEFAULT,
  ALTER COLUMN fecha_alta TYPE timestamp USING (CURRENT_DATE + fecha_alta),
  ALTER COLUMN fecha_alta SET DEFAULT now();

ALTER TABLE clientes
  ALTER COLUMN fecha_registro DROP DEFAULT,
  ALTER COLUMN fecha_registro TYPE timestamp USING (CURRENT_DATE + fecha_registro),
  ALTER COLUMN fecha_registro SET DEFAULT now();

ALTER TABLE eventos
  ALTER COLUMN fecha_creacion DROP DEFAULT,
  ALTER COLUMN fecha_creacion TYPE timestamp USING (CURRENT_DATE + fecha_creacion),
  ALTER COLUMN fecha_creacion SET DEFAULT now();

ALTER TABLE pagos
  ALTER COLUMN fecha_pago DROP DEFAULT,
  ALTER COLUMN fecha_pago TYPE timestamp USING (CURRENT_DATE + fecha_pago),
  ALTER COLUMN fecha_pago SET DEFAULT now();

COMMIT;
