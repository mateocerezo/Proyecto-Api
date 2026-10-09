import { AppError } from "../utils/AppError.js";
import * as usuariosModel from "../models/usuarios.model.js";

/**
 * Middleware multi-tenant. Debe ir SIEMPRE después de autenticar.
 *
 * Reglas:
 *  - La empresa sale ÚNICAMENTE del token firmado, nunca del body, query ni
 *    headers del cliente (si no, cualquiera podría leer datos de otro tenant).
 *  - Se verifica contra la base que el usuario y su empresa sigan activos, para
 *    que desactivar a alguien corte el acceso al instante (sin esperar a que
 *    expire el token). También se refresca el rol por si cambió.
 *  - Deja req.id_empresa listo: controladores -> servicios -> modelos lo
 *    reciben como primer parámetro y TODAS las consultas filtran por él.
 */
export const resolverEmpresa = async (req, res, next) => {
  const { id_usuario, id_empresa } = req.usuario ?? {};
  if (!id_usuario || !id_empresa) {
    throw AppError.unauthorized();
  }

  const acceso = await usuariosModel.obtenerEstadoAcceso(id_usuario, id_empresa);

  if (!acceso || !acceso.activo) {
    throw AppError.unauthorized("El usuario no existe o está deshabilitado");
  }
  if (!acceso.empresa_activa) {
    throw AppError.forbidden("La empresa se encuentra deshabilitada");
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
