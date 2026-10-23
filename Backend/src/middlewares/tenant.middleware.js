import { AppError } from "../utils/AppError.js";
import * as usuariosModel from "../models/usuarios.model.js";

// Códigos para que el frontend decida qué pantalla mostrar.
export const CODIGOS_ACCESO = {
  SIN_EMPRESA: "SIN_EMPRESA", // tiene cuenta en Clerk pero no registró empresa
  USUARIO_INACTIVO: "USUARIO_INACTIVO",
  EMPRESA_INACTIVA: "EMPRESA_INACTIVA" // pendiente de aprobación o deshabilitada
};

/**
 * Middleware multi-tenant. Debe ir SIEMPRE después de autenticar.
 *
 * Reglas:
 *  - La empresa sale ÚNICAMENTE del usuario vinculado a la sesión de Clerk,
 *    nunca del body, query ni headers del cliente (si no, cualquiera podría
 *    leer datos de otro tenant).
 *  - Se verifica contra la base que el usuario y su empresa sigan activos en
 *    cada request, así desactivar a alguien corta el acceso al instante.
 *  - Deja req.id_empresa listo: controladores -> servicios -> modelos lo
 *    reciben como primer parámetro y TODAS las consultas filtran por él.
 */
export const resolverEmpresa = async (req, res, next) => {
  if (!req.clerkUserId) {
    throw AppError.unauthorized();
  }

  const acceso = await usuariosModel.obtenerAccesoPorClerkId(req.clerkUserId);

  if (!acceso) {
    throw new AppError(
      403,
      "La cuenta no está asociada a ninguna empresa",
      undefined,
      CODIGOS_ACCESO.SIN_EMPRESA
    );
  }
  if (!acceso.activo) {
    throw new AppError(403, "El usuario está deshabilitado", undefined, CODIGOS_ACCESO.USUARIO_INACTIVO);
  }
  if (!acceso.empresa_activa) {
    throw new AppError(
      403,
      "La empresa está pendiente de aprobación o fue deshabilitada",
      undefined,
      CODIGOS_ACCESO.EMPRESA_INACTIVA
    );
  }

  req.usuario = {
    id_usuario: acceso.id_usuario,
    id_empresa: acceso.id_empresa,
    nombre: acceso.nombre,
    apellido: acceso.apellido,
    email: acceso.email,
    rol: acceso.rol,
    empresa: acceso.empresa
  };
  req.id_empresa = acceso.id_empresa;
  next();
};
