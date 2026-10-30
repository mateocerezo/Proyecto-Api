import pool from "../data/db.js";
import { exigirEmpresa } from "../utils/sql.js";

// Fotos de la empresa (id_espacio NULL) y de sus espacios. Los bytes solo se
// leen en buscarPublica; los listados devuelven metadatos para no traer MB
// de datos que el frontend pide después por URL.

const COLUMNAS = "id_imagen, id_espacio, tipo_mime, tamano, fecha_alta";

export const listar = async (idEmpresa) => {
  exigirEmpresa(idEmpresa);
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS} FROM imagenes WHERE id_empresa = $1 ORDER BY id_imagen`,
    [idEmpresa]
  );
  return rows;
};

// id_espacio NULL cuenta las fotos de la empresa; un número, las de ese espacio.
export const contar = async (client, idEmpresa, idEspacio) => {
  exigirEmpresa(idEmpresa);
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS total FROM imagenes
      WHERE id_empresa = $1 AND id_espacio IS NOT DISTINCT FROM $2`,
    [idEmpresa, idEspacio]
  );
  return rows[0].total;
};

export const crear = async (client, idEmpresa, { idEspacio, tipoMime, datos }) => {
  exigirEmpresa(idEmpresa);
  const { rows } = await client.query(
    `INSERT INTO imagenes (id_empresa, id_espacio, tipo_mime, datos, tamano)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${COLUMNAS}`,
    [idEmpresa, idEspacio, tipoMime, datos, datos.length]
  );
  return rows[0];
};

export const eliminar = async (idEmpresa, idImagen) => {
  exigirEmpresa(idEmpresa);
  const { rowCount } = await pool.query(
    "DELETE FROM imagenes WHERE id_empresa = $1 AND id_imagen = $2",
    [idEmpresa, idImagen]
  );
  return rowCount > 0;
};

// Para la landing: solo imágenes de empresas activas.
export const buscarPublica = async (idImagen) => {
  const { rows } = await pool.query(
    `SELECT i.tipo_mime, i.datos FROM imagenes i
       JOIN empresas e ON e.id_empresa = i.id_empresa
      WHERE i.id_imagen = $1 AND e.activa`,
    [idImagen]
  );
  return rows[0] ?? null;
};
