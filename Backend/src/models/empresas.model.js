import pool from "../data/db.js";

// La tabla empresas es la raíz de los tenants: estas consultas no filtran por
// id_empresa del token. Las públicas devuelven SOLO empresas activas y nunca
// datos internos; las de gestión las usa únicamente el SuperAdmin.

const COLUMNAS_PUBLICAS = "id_empresa, nombre, email, telefono";
const COLUMNAS_GESTION = "id_empresa, nombre, cuit, email, telefono, activa, fecha_alta";

// ---------- Público (landing) ----------

export const listarActivas = async () => {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS_PUBLICAS} FROM empresas WHERE activa ORDER BY nombre`
  );
  return rows;
};

export const buscarActiva = async (idEmpresa) => {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS_PUBLICAS} FROM empresas WHERE id_empresa = $1 AND activa`,
    [idEmpresa]
  );
  return rows[0] ?? null;
};

// ---------- Registro (dentro de la transacción del servicio) ----------

// Nace inactiva: no puede operar hasta que la apruebe el SuperAdmin.
export const crearPendiente = async (client, { nombre, cuit, email, telefono }) => {
  const { rows } = await client.query(
    `INSERT INTO empresas (nombre, cuit, email, telefono, activa)
     VALUES ($1, $2, $3, $4, false)
     RETURNING ${COLUMNAS_GESTION}`,
    [nombre, cuit, email, telefono ?? null]
  );
  return rows[0];
};

export const crearRol = async (client, idEmpresa, nombre) => {
  const { rows } = await client.query(
    "INSERT INTO roles (id_empresa, nombre) VALUES ($1, $2) RETURNING id_rol",
    [idEmpresa, nombre]
  );
  return rows[0].id_rol;
};

// La contraseña la gestiona Clerk: el usuario se vincula por clerk_user_id.
export const crearUsuario = async (client, { idEmpresa, idRol, clerkUserId, nombre, apellido, email }) => {
  const { rows } = await client.query(
    `INSERT INTO usuarios (id_empresa, id_rol, clerk_user_id, nombre, apellido, email)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id_usuario, nombre, apellido, email`,
    [idEmpresa, idRol, clerkUserId, nombre, apellido, email]
  );
  return rows[0];
};

// ---------- SuperAdmin ----------

// activa: true | false | null (todas).
export const listar = async (activa) => {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS_GESTION} FROM empresas
      WHERE ($1::boolean IS NULL OR activa = $1)
      ORDER BY fecha_alta DESC`,
    [activa]
  );
  return rows;
};

export const cambiarActiva = async (idEmpresa, activa) => {
  const { rows } = await pool.query(
    `UPDATE empresas SET activa = $2 WHERE id_empresa = $1 RETURNING ${COLUMNAS_GESTION}`,
    [idEmpresa, activa]
  );
  return rows[0] ?? null;
};

/**
 * Borra una solicitud de registro NO aprobada junto con su usuario y rol.
 * Si la empresa ya tiene otros datos (eventos, catálogo...) la FK lo impide.
 * Devuelve false si no existe o si está activa.
 */
export const eliminarPendiente = async (client, idEmpresa) => {
  const { rows } = await client.query(
    "SELECT 1 FROM empresas WHERE id_empresa = $1 AND NOT activa FOR UPDATE",
    [idEmpresa]
  );
  if (rows.length === 0) return false;

  await client.query("DELETE FROM usuarios WHERE id_empresa = $1", [idEmpresa]);
  await client.query("DELETE FROM roles WHERE id_empresa = $1", [idEmpresa]);
  await client.query("DELETE FROM empresas WHERE id_empresa = $1", [idEmpresa]);
  return true;
};
