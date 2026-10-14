import pool from "../data/db.js";
import { armarSet, exigirEmpresa } from "../utils/sql.js";

// precio es DECIMAL(10,2): se envía como string y pg lo devuelve como
// string ("8500.00") para no perder precisión. No convertir a float acá.

const COLUMNAS = "id_servicio, nombre, descripcion, precio";
const EDITABLES = ["nombre", "descripcion", "precio"];

export const listar = async (idEmpresa) => {
  exigirEmpresa(idEmpresa);
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS} FROM servicios WHERE id_empresa = $1 ORDER BY nombre`,
    [idEmpresa]
  );
  return rows;
};

export const buscarPorId = async (idEmpresa, id) => {
  exigirEmpresa(idEmpresa);
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS} FROM servicios WHERE id_empresa = $1 AND id_servicio = $2`,
    [idEmpresa, id]
  );
  return rows[0] ?? null;
};

export const crear = async (idEmpresa, { nombre, descripcion, precio }) => {
  exigirEmpresa(idEmpresa);
  const { rows } = await pool.query(
    `INSERT INTO servicios (id_empresa, nombre, descripcion, precio)
     VALUES ($1, $2, $3, $4::numeric)
     RETURNING ${COLUMNAS}`,
    [idEmpresa, nombre, descripcion ?? null, precio]
  );
  return rows[0];
};

export const actualizar = async (idEmpresa, id, cambios) => {
  exigirEmpresa(idEmpresa);
  const { set, valores } = armarSet(cambios, EDITABLES, 3);
  const { rows } = await pool.query(
    `UPDATE servicios SET ${set}
      WHERE id_empresa = $1 AND id_servicio = $2
     RETURNING ${COLUMNAS}`,
    [idEmpresa, id, ...valores]
  );
  return rows[0] ?? null;
};

export const eliminar = async (idEmpresa, id) => {
  exigirEmpresa(idEmpresa);
  const { rowCount } = await pool.query(
    "DELETE FROM servicios WHERE id_empresa = $1 AND id_servicio = $2",
    [idEmpresa, id]
  );
  return rowCount > 0;
};
