import pool from "../data/db.js";

// Consultas de usuarios. La identidad (email verificado, contraseña) vive en
// Clerk; acá cada usuario se vincula por clerk_user_id con su empresa y su rol.
// El rol se obtiene de la tabla roles y se normaliza a minúsculas ("Admin" -> "admin").

const COLUMNAS_ACCESO = `
  u.id_usuario, u.id_empresa, u.nombre, u.apellido, u.email, u.activo,
  LOWER(r.nombre) AS rol, e.nombre AS empresa, e.activa AS empresa_activa`;

const JOINS_ACCESO = `
  FROM usuarios u
  JOIN roles r    ON r.id_empresa = u.id_empresa AND r.id_rol = u.id_rol
  JOIN empresas e ON e.id_empresa = u.id_empresa`;

// Para el middleware multi-tenant: estado actual del usuario, su rol y su empresa.
// clerk_user_id es UNIQUE: cada cuenta de Clerk pertenece a una sola empresa.
export const obtenerAccesoPorClerkId = async (clerkUserId) => {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS_ACCESO}
     ${JOINS_ACCESO}
      WHERE u.clerk_user_id = $1`,
    [clerkUserId]
  );
  return rows[0] ?? null;
};
