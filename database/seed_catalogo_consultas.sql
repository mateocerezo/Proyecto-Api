-- Catálogo que usa el formulario público (Frontend/src/data/catalog.js).
-- Los NOMBRES deben coincidir con los del sitio: el backend busca por nombre.
-- Cambiá v_empresa por el id_empresa que pusiste en ID_EMPRESA_CONSULTAS.
-- Es idempotente: no duplica filas que ya existan.

DO $$
DECLARE
  v_empresa int := 5;
BEGIN
  INSERT INTO tipos_evento (id_empresa, nombre, descripcion, precio_base)
  SELECT v_empresa, t.nombre, t.descripcion, t.precio
    FROM (VALUES
      ('Esencial', 'Salón privado, equipo de sonido y personal de sala.', 650000),
      ('VIP',      'Todo lo de Esencial, más barra premium y DJ durante el evento.', 920000),
      ('Temática', 'Todo lo de VIP, más decoración temática y coordinador personal.', 1280000)
    ) AS t(nombre, descripcion, precio)
   WHERE NOT EXISTS (
     SELECT 1 FROM tipos_evento x WHERE x.id_empresa = v_empresa AND LOWER(x.nombre) = LOWER(t.nombre));

  INSERT INTO espacios (id_empresa, nombre, descripcion, capacidad, precio_adicional)
  SELECT v_empresa, t.nombre, t.descripcion, t.capacidad, t.precio
    FROM (VALUES
      ('Salón principal', 'Siempre incluido en la propuesta.', 20, 0),
      ('Lounge VIP',      '+12 lugares para tener más espacio.', 12, 180000),
      ('Terraza',         '+16 lugares al aire libre.', 16, 140000)
    ) AS t(nombre, descripcion, capacidad, precio)
   WHERE NOT EXISTS (
     SELECT 1 FROM espacios x WHERE x.id_empresa = v_empresa AND LOWER(x.nombre) = LOWER(t.nombre));

  INSERT INTO servicios (id_empresa, nombre, descripcion, precio)
  SELECT v_empresa, t.nombre, t.descripcion, t.precio
    FROM (VALUES
      ('Barra de tragos',  'Clásicos y tragos de autor. Precio por invitado.', 18000),
      ('Finger food',      'Ocho piezas por persona. Precio por invitado.', 24000),
      ('DJ set extendido', 'Una hora extra de música.', 95000)
    ) AS t(nombre, descripcion, precio)
   WHERE NOT EXISTS (
     SELECT 1 FROM servicios x WHERE x.id_empresa = v_empresa AND LOWER(x.nombre) = LOWER(t.nombre));
END $$;
