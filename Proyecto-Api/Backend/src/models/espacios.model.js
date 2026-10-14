import pool from "../data/db.js";
import { armarSet, exigirEmpresa } from "../utils/sql.js";

// precio_adicional es DECIMAL(10,2): se envía como string y pg lo devuelve
// como string ("15000.00") para no perder precisión. No convertir a float acá.

const COLUMNAS = "id_espacio, nombre, descripcion, capacidad, precio_adicional";
const EDITABLES = ["nombre", "descripcion", "capacidad", "precio_adicional"];

export const listar = async (idEmpresa) => {
  exigirEmpresa(idEmpresa);
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS} FROM espacios WHERE id_empresa = $1 ORDER BY nombre`,
    [idEmpresa]
  );
  return rows;
};

export const buscarPorId = async (idEmpresa, id) => {
  exigirEmpresa(idEmpresa);
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS} FROM espacios WHERE id_empresa = $1 AND id_espacio = $2`,
    [idEmpresa, id]
  );
  return rows[0] ?? null;
};

export const crear = async (idEmpresa, { nombre, descripcion, capacidad, precio_adicional }) => {
  exigirEmpresa(idEmpresa);
  const { rows } = await pool.query(
    `INSERT INTO espacios (id_empresa, nombre, descripcion, capacidad, precio_adicional)
     VALUES ($1, $2, $3, $4, $5::numeric)
     RETURNING ${COLUMNAS}`,
    [idEmpresa, nombre, descripcion ?? null, capacidad, precio_adicional]
  );
  return rows[0];
};

export const actualizar = async (idEmpresa, id, cambios) => {
  exigirEmpresa(idEmpresa);
  const { set, valores } = armarSet(cambios, EDITABLES, 3);
  const { rows } = await pool.query(
    `UPDATE espacios SET ${set}
      WHERE id_empresa = $1 AND id_espacio = $2
     RETURNING ${COLUMNAS}`,
    [idEmpresa, id, ...valores]
  );
  return rows[0] ?? null;
};

export const eliminar = async (idEmpresa, id) => {
  exigirEmpresa(idEmpresa);
  const { rowCount } = await pool.query(
    "DELETE FROM espacios WHERE id_empresa = $1 AND id_espacio = $2",
    [idEmpresa, id]
  );
  return rowCount > 0;
};
