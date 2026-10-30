-- Perfil público de la empresa ("propuesta"): lo edita el admin de la empresa
-- desde su panel y lo ve el cliente en la landing. Columnas opcionales, no
-- afecta a las empresas existentes. Ejecutar una sola vez.
BEGIN;

ALTER TABLE empresas
  ADD COLUMN descripcion VARCHAR(1000),
  ADD COLUMN direccion VARCHAR(200),
  ADD COLUMN imagen_url VARCHAR(500);

COMMIT;
