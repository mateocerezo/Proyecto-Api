import pool from "../data/db.js";
import { armarSet, exigirEmpresa } from "../utils/sql.js";

// Todas las funciones reciben idEmpresa como PRIMER parámetro y todas las
// consultas filtran por id_empresa. Un registro de otra empresa se comporta
// exactamente igual que uno inexistente.
// precio_base es DECIMAL(10,2): se envía como string y pg lo devuelve como
// string ("15000.00") para no perder precisión. No convertir a float acá.

const COLUMNAS = "id_tipo_evento, nombre, descripcion, precio_base";
const EDITABLES = ["nombre", "descripcion", "precio_base"];

export const listar = async (idEmpresa) => {
  exigirEmpresa(idEmpresa);
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS} FROM tipos_evento WHERE id_empresa = $1 ORDER BY nombre`,
    [idEmpresa]
  );
  return rows;
};

export const buscarPorId = async (idEmpresa, id) => {
  exigirEmpresa(idEmpresa);
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS} FROM tipos_evento WHERE id_empresa = $1 AND id_tipo_evento = $2`,
    [idEmpresa, id]
  );
  return rows[0] ?? null;
};

export const crear = async (idEmpresa, { nombre, descripcion, precio_base }) => {
  exigirEmpresa(idEmpresa);
  const { rows } = await pool.query(
    `INSERT INTO tipos_evento (id_empresa, nombre, descripcion, precio_base)
     VALUES ($1, $2, $3, $4::numeric)
     RETURNING ${COLUMNAS}`,
    [idEmpresa, nombre, descripcion ?? null, precio_base]
  );
  return rows[0];
};

export const actualizar = async (idEmpresa, id, cambios) => {
  exigirEmpresa(idEmpresa);
  const { set, valores } = armarSet(cambios, EDITABLES, 3);
  const { rows } = await pool.query(
    `UPDATE tipos_evento SET ${set}
      WHERE id_empresa = $1 AND id_tipo_evento = $2
     RETURNING ${COLUMNAS}`,
    [idEmpresa, id, ...valores]
  );
  return rows[0] ?? null;
};

export const eliminar = async (idEmpresa, id) => {
  exigirEmpresa(idEmpresa);
  const { rowCount } = await pool.query(
    "DELETE FROM tipos_evento WHERE id_empresa = $1 AND id_tipo_evento = $2",
    [idEmpresa, id]
  );
  return rowCount > 0;
};
