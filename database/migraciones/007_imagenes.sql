-- Fotos de la empresa (id_espacio NULL) y de cada espacio/salón.
-- Se guardan en la base (bytea) para no depender de un storage externo; el
-- frontend las achica antes de subirlas y el backend limita tamaño y cantidad.
-- La portada de la empresa pasa a ser su primera foto: imagen_url ya no se usa.
-- Ejecutar una sola vez.
BEGIN;

CREATE TABLE imagenes (
  id_imagen SERIAL PRIMARY KEY,
  id_empresa INTEGER NOT NULL REFERENCES empresas (id_empresa) ON DELETE CASCADE,
  id_espacio INTEGER REFERENCES espacios (id_espacio) ON DELETE CASCADE,
  tipo_mime VARCHAR(20) NOT NULL CHECK (tipo_mime IN ('image/jpeg', 'image/png', 'image/webp')),
  datos BYTEA NOT NULL,
  tamano INTEGER NOT NULL,
  fecha_alta TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX imagenes_empresa_idx ON imagenes (id_empresa, id_espacio, id_imagen);

ALTER TABLE empresas DROP COLUMN imagen_url;

COMMIT;
