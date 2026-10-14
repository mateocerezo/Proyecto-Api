import pool from "../data/db.js";
import { exigirEmpresa } from "../utils/sql.js";

// Devuelve el rol de la empresa con ese nombre (sin distinguir mayúsculas),
// creándolo si todavía no existe.
export const obtenerOCrear = async (idEmpresa, nombre) => {
  exigirEmpresa(idEmpresa);
  const existente = await pool.query(
    "SELECT id_rol, nombre FROM roles WHERE id_empresa = $1 AND LOWER(nombre) = LOWER($2)",
    [idEmpresa, nombre]
  );
  if (existente.rows[0]) return existente.rows[0];

  const { rows } = await pool.query(
    "INSERT INTO roles (id_empresa, nombre) VALUES ($1, $2) RETURNING id_rol, nombre",
    [idEmpresa, nombre]
  );
  return rows[0];
};
