import pool from "../data/db.js";
import { armarSet, exigirEmpresa } from "../utils/sql.js";

// La tabla empresas es la raíz de los tenants: estas consultas no filtran por
// id_empresa del token. Las públicas devuelven SOLO empresas activas y nunca
// datos internos; las de gestión las usa únicamente el SuperAdmin.

// id_portada: primera foto de la empresa (no de un espacio), o NULL.
const COLUMNAS_PUBLICAS = `id_empresa, nombre, email, telefono, descripcion, direccion,
  (SELECT MIN(i.id_imagen) FROM imagenes i
    WHERE i.id_empresa = empresas.id_empresa AND i.id_espacio IS NULL) AS id_portada`;
const COLUMNAS_GESTION = "id_empresa, nombre, cuit, email, telefono, activa, estado, fecha_alta";
const COLUMNAS_PERFIL = "id_empresa, nombre, cuit, email, telefono, descripcion, direccion, estado";
// El CUIT y el estado no los cambia la empresa: el CUIT la identifica ante el
// SuperAdmin y el estado lo maneja solo él.
const EDITABLES_PERFIL = ["nombre", "email", "telefono", "descripcion", "direccion"];

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

// ---------- Perfil de la empresa logueada ----------

export const buscarPerfil = async (idEmpresa) => {
  exigirEmpresa(idEmpresa);
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS_PERFIL} FROM empresas WHERE id_empresa = $1`,
    [idEmpresa]
  );
  return rows[0] ?? null;
};

export const actualizarPerfil = async (idEmpresa, cambios) => {
  exigirEmpresa(idEmpresa);
  const { set, valores } = armarSet(cambios, EDITABLES_PERFIL, 2);
  const { rows } = await pool.query(
    `UPDATE empresas SET ${set}
      WHERE id_empresa = $1
     RETURNING ${COLUMNAS_PERFIL}`,
    [idEmpresa, ...valores]
  );
  return rows[0] ?? null;
};

// ---------- Registro (dentro de la transacción del servicio) ----------

// Nace inactiva: no puede operar hasta que la apruebe el SuperAdmin.
export const crearPendiente = async (client, { nombre, cuit, email, telefono }) => {
  const { rows } = await client.query(
    `INSERT INTO empresas (nombre, cuit, email, telefono, activa, estado)
     VALUES ($1, $2, $3, $4, false, 'pendiente')
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

// estado: pendiente | activa | inactiva | null (todas).
export const listar = async (estado) => {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS_GESTION} FROM empresas
      WHERE ($1::text IS NULL OR estado = $1)
      ORDER BY fecha_alta DESC`,
    [estado]
  );
  return rows;
};

export const cambiarEstado = async (idEmpresa, estado) => {
  const activa = estado === "activa";
  const { rows } = await pool.query(
    `UPDATE empresas SET activa = $2, estado = $3
      WHERE id_empresa = $1
     RETURNING ${COLUMNAS_GESTION}`,
    [idEmpresa, activa, estado]
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
    "SELECT 1 FROM empresas WHERE id_empresa = $1 AND estado = 'pendiente' FOR UPDATE",
    [idEmpresa]
  );
  if (rows.length === 0) return false;

  await client.query("DELETE FROM usuarios WHERE id_empresa = $1", [idEmpresa]);
  await client.query("DELETE FROM roles WHERE id_empresa = $1", [idEmpresa]);
  await client.query("DELETE FROM empresas WHERE id_empresa = $1", [idEmpresa]);
  return true;
};
