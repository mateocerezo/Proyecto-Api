import { clerkClient } from "@clerk/express";
import { env } from "../config/env.js";
import { enTransaccion } from "../data/transaccion.js";
import { AppError } from "../utils/AppError.js";
import { PG, traducirErrorPg } from "../utils/pgErrores.js";
import * as modelo from "../models/empresas.model.js";
import * as usuariosModel from "../models/usuarios.model.js";
import * as tiposEventoModel from "../models/tiposEvento.model.js";
import * as espaciosModel from "../models/espacios.model.js";
import * as serviciosModel from "../models/servicios.model.js";

const NO_ENCONTRADA = "Empresa no encontrada";
const ROL_ADMIN = "admin";

// ---------- Público ----------

const CUENTA_CON_EMPRESA = "Tu cuenta ya tiene una empresa registrada";

// Email principal de la cuenta de Clerk, solo si está verificado.
const emailVerificado = (persona) => {
  const principal = persona.primaryEmailAddress;
  return principal?.verification?.status === "verified" ? principal.emailAddress.toLowerCase() : null;
};

/**
 * Alta de una empresa nueva por una persona logueada en Clerk:
 * empresa (inactiva) + rol admin + usuario vinculado a su cuenta, todo en una
 * transacción. No puede operar hasta que el SuperAdmin la apruebe.
 */
export const registrar = async (clerkUserId, { empresa, admin }) => {
  if (clerkUserId === env.superAdminClerkId) {
    throw AppError.forbidden("El SuperAdmin no puede registrar empresas con su cuenta");
  }
  if (await usuariosModel.obtenerAccesoPorClerkId(clerkUserId)) {
    throw AppError.conflict(CUENTA_CON_EMPRESA);
  }

  const persona = await clerkClient.users.getUser(clerkUserId);
  const email = emailVerificado(persona);
  if (!email) {
    throw AppError.badRequest("La cuenta no tiene un email verificado");
  }
  const nombre = admin?.nombre ?? persona.firstName?.trim().slice(0, 80);
  const apellido = admin?.apellido ?? persona.lastName?.trim().slice(0, 80);
  if (!nombre || !apellido) {
    throw AppError.badRequest("Indique nombre y apellido del administrador (admin.nombre, admin.apellido)");
  }

  try {
    return await enTransaccion(async (client) => {
      const nueva = await modelo.crearPendiente(client, empresa);
      const idRol = await modelo.crearRol(client, nueva.id_empresa, ROL_ADMIN);
      const usuario = await modelo.crearUsuario(client, {
        idEmpresa: nueva.id_empresa,
        idRol,
        clerkUserId,
        nombre,
        apellido,
        email
      });
      return { empresa: nueva, usuario: { ...usuario, rol: ROL_ADMIN } };
    });
  } catch (error) {
    // Dos registros simultáneos con la misma cuenta: los frena el UNIQUE.
    if (error.code === PG.UNIQUE_VIOLATION && error.constraint === "usuarios_clerk_user_id_key") {
      throw AppError.conflict(CUENTA_CON_EMPRESA);
    }
    throw traducirErrorPg(error, { duplicado: "Ya existe una empresa con ese nombre o CUIT" });
  }
};

export const listarActivas = () => modelo.listarActivas();

// Catálogo que ve el cliente en la landing (solo empresas activas).
export const catalogoPublico = async (idEmpresa) => {
  const empresa = await modelo.buscarActiva(idEmpresa);
  if (!empresa) throw AppError.notFound(NO_ENCONTRADA);

  const [tipos_evento, espacios, servicios] = await Promise.all([
    tiposEventoModel.listar(idEmpresa),
    espaciosModel.listar(idEmpresa),
    serviciosModel.listar(idEmpresa)
  ]);
  return { empresa, tipos_evento, espacios, servicios };
};

// ---------- SuperAdmin ----------

const FILTRO_ESTADO = {
  pendientes: "pendiente",
  activas: "activa",
  inactivas: "inactiva",
  todas: null
};

export const listar = (estado) => modelo.listar(FILTRO_ESTADO[estado]);

const cambiarEstado = async (idEmpresa, estado) => {
  const empresa = await modelo.cambiarEstado(idEmpresa, estado);
  if (!empresa) throw AppError.notFound(NO_ENCONTRADA);
  return empresa;
};

export const aprobar = (idEmpresa) => cambiarEstado(idEmpresa, "activa");

export const activar = (idEmpresa) => cambiarEstado(idEmpresa, "activa");

// Suspende una empresa ya aprobada: sus usuarios pierden acceso en el próximo
// request (resolverEmpresa) y deja de aparecer en el catálogo público.
export const desactivar = (idEmpresa) => cambiarEstado(idEmpresa, "inactiva");

// Rechaza una solicitud de registro: la borra para liberar nombre y CUIT.
export const rechazar = async (idEmpresa) => {
  let eliminada;
  try {
    eliminada = await enTransaccion((client) => modelo.eliminarPendiente(client, idEmpresa));
  } catch (error) {
    throw traducirErrorPg(error, {
      enUso: "La empresa ya tiene datos cargados; desactivela en lugar de rechazarla"
    });
  }
  if (!eliminada) throw AppError.notFound("No hay una solicitud pendiente con ese id");
};
