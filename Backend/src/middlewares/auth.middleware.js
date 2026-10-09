import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

/**
 * Autenticación: exige "Authorization: Bearer <token>" y verifica el JWT.
 * Deja en req.usuario = { id_usuario, id_empresa, rol }.
 *
 * Solo valida la firma; que el usuario/empresa sigan activos lo comprueba
 * el middleware multi-tenant (resolverEmpresa), que va a continuación.
 */
export const autenticar = (req, res, next) => {
  const [esquema, token] = (req.headers.authorization ?? "").split(" ");

  if (esquema !== "Bearer" || !token) {
    throw AppError.unauthorized("Token de acceso requerido");
  }

  let payload;
  try {
    // Fijar el algoritmo evita ataques de "alg confusion".
    payload = jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] });
  } catch (error) {
    throw AppError.unauthorized(
      error.name === "TokenExpiredError" ? "La sesión expiró, inicie sesión nuevamente" : "Token inválido"
    );
  }

  const idUsuario = Number(payload.sub);
  if (!Number.isInteger(idUsuario) || !Number.isInteger(payload.id_empresa)) {
    throw AppError.unauthorized("Token inválido");
  }

  req.usuario = { id_usuario: idUsuario, id_empresa: payload.id_empresa, rol: payload.rol };
  next();
};

/**
 * Autorización por rol. Usar DESPUÉS de autenticar y resolverEmpresa
 * (este último refresca el rol desde la base).
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
