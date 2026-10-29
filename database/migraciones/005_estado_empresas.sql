-- Distingue las solicitudes pendientes de las empresas dadas de baja.
-- Los registros inactivos existentes se consideran pendientes porque el
-- esquema anterior no guardaba el motivo de la inactividad.
BEGIN;

ALTER TABLE empresas ADD COLUMN estado VARCHAR(10);

UPDATE empresas
   SET estado = CASE WHEN activa THEN 'activa' ELSE 'pendiente' END;

ALTER TABLE empresas
  ALTER COLUMN estado SET DEFAULT 'pendiente',
  ALTER COLUMN estado SET NOT NULL,
  ADD CONSTRAINT empresas_estado_check
    CHECK (estado IN ('pendiente', 'activa', 'inactiva'));

COMMIT;
