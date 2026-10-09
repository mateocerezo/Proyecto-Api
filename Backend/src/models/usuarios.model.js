import pool from "../data/db.js";

// Consultas de usuarios. Nunca devolver contrasena_hash fuera de la capa de servicios.
// El rol se obtiene de la tabla roles y se normaliza a minúsculas ("Admin" -> "admin").

const COLUMNAS_ACCESO = `
  u.id_usuario, u.id_empresa, u.nombre, u.apellido, u.email, u.activo,
  LOWER(r.nombre) AS rol, e.nombre AS empresa, e.activa AS empresa_activa`;

const JOINS_ACCESO = `
  FROM usuarios u
  JOIN roles r    ON r.id_empresa = u.id_empresa AND r.id_rol = u.id_rol
  JOIN empresas e ON e.id_empresa = u.id_empresa`;

/**
 * Para el login. El email es único POR EMPRESA, así que puede haber varios
 * usuarios con el mismo email en empresas distintas: se devuelven todos y el
 * servicio decide. Si viene idEmpresa, se acota a esa empresa.
 */
export const buscarParaLogin = async (email, idEmpresa = null) => {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS_ACCESO}, u.contrasena_hash
     ${JOINS_ACCESO}
      WHERE LOWER(u.email) = $1
        AND ($2::int IS NULL OR u.id_empresa = $2)`,
    [email, idEmpresa]
  );
  return rows;
};

// Para el middleware multi-tenant: estado actual del usuario, su rol y su empresa.
export const obtenerEstadoAcceso = async (idUsuario, idEmpresa) => {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS_ACCESO}
     ${JOINS_ACCESO}
      WHERE u.id_usuario = $1 AND u.id_empresa = $2`,
    [idUsuario, idEmpresa]
  );
  return rows[0] ?? null;
};

export const crear = async ({ idEmpresa, idRol, nombre, apellido, email, contrasenaHash }) => {
  const { rows } = await pool.query(
    `INSERT INTO usuarios (id_empresa, id_rol, nombre, apellido, email, contrasena_hash)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id_usuario, id_empresa, id_rol, nombre, apellido, email, activo`,
    [idEmpresa, idRol, nombre, apellido, email, contrasenaHash]
  );
  return rows[0];
};
