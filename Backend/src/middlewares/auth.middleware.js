import { getAuth } from "@clerk/express";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

// Clerk se encarga de la identidad (login, contraseña, MFA). Estos middlewares
// solo leen el resultado de clerkMiddleware (registrado en app.js); qué empresa
// y qué rol tiene cada persona lo decide nuestra base (resolverEmpresa).

export const ROL_SUPERADMIN = "superadmin";

// userId de Clerk de la sesión, o error 401 si no hay sesión válida.
const usuarioDeClerk = (req) => {
  const { isAuthenticated, userId } = getAuth(req);
  if (!isAuthenticated || !userId) {
    throw AppError.unauthorized("Sesión requerida");
  }
  return userId;
};

/**
 * Exige una sesión válida de Clerk y deja req.clerkUserId.
 * Para rutas de empresa va seguido de resolverEmpresa.
 */
export const autenticar = (req, res, next) => {
  req.clerkUserId = usuarioDeClerk(req);
  next();
};

/**
 * Solo el SuperAdmin global (SUPERADMIN_CLERK_USER_ID). Sus rutas no pasan
 * por resolverEmpresa: no pertenece a ningún tenant.
 */
export const autenticarSuperAdmin = (req, res, next) => {
  const userId = usuarioDeClerk(req);
  if (userId !== env.superAdminClerkId) {
    throw AppError.forbidden();
  }
  req.clerkUserId = userId;
  req.usuario = { rol: ROL_SUPERADMIN };
  next();
};

/**
 * Autorización por rol. Usar DESPUÉS de autenticar y resolverEmpresa
 * (este último carga el rol desde la base).
 *
 * Uso: router.post("/", autorizar("admin"), controlador)
 */
export const autorizar =
  (...roles) =>
  (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      throw AppError.forbidden();
    }
    next();
  };
