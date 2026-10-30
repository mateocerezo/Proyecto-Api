import { AppError } from "../utils/AppError.js";
import { PG } from "../utils/pgErrores.js";

// 404 para rutas inexistentes: se registra después de todas las rutas.
export const rutaNoEncontrada = (req, res) => {
  res.status(404).json({ mensaje: "Ruta no encontrada" });
};

// Respuestas genéricas para errores de PostgreSQL que no fueron
// traducidos a un mensaje de negocio en la capa de servicios.
const ERRORES_PG = {
  [PG.UNIQUE_VIOLATION]: [409, "Ya existe un registro con esos datos"],
  [PG.FOREIGN_KEY_VIOLATION]: [409, "La operación viola una relación con otro registro"],
  [PG.CHECK_VIOLATION]: [400, "Los datos no cumplen las restricciones de la base de datos"],
  [PG.NOT_NULL_VIOLATION]: [400, "Falta un campo obligatorio"],
  [PG.INVALID_TEXT_REPRESENTATION]: [400, "Formato de dato inválido"],
  [PG.NUMERIC_OUT_OF_RANGE]: [400, "Valor numérico fuera de rango"]
};

// Errores de conexión con la base: el cliente recibe 503, no 500.
// EAI_AGAIN = fallo temporal de DNS; ECONNRESET = la conexión se cortó a mitad.
const ERRORES_CONEXION = new Set([
  "ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN", "ECONNRESET", "ENETUNREACH", "57P01", "57P03"
]);

/**
 * Manejador global de errores. Express 5 envía acá automáticamente las
 * promesas rechazadas de controladores/middlewares async, por eso no hace
 * falta try/catch en cada controlador.
 */
// eslint-disable-next-line no-unused-vars
export const manejarErrores = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      mensaje: err.message,
      ...(err.codigo && { codigo: err.codigo }),
      ...(err.detalles && { detalles: err.detalles })
    });
  }

  // Body con JSON mal formado o demasiado grande (lanzados por express.json)
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ mensaje: "El cuerpo de la petición no es un JSON válido" });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ mensaje: "El cuerpo de la petición es demasiado grande" });
  }

  if (ERRORES_PG[err.code]) {
    const [status, mensaje] = ERRORES_PG[err.code];
    return res.status(status).json({ mensaje });
  }

  if (ERRORES_CONEXION.has(err.code)) {
    console.error("[DB] Sin conexión con la base de datos:", err.message);
    return res.status(503).json({ mensaje: "Servicio no disponible, intente más tarde" });
  }

  // Error inesperado: se loguea completo pero NO se filtran detalles al cliente.
  console.error(`[ERROR] ${req.method} ${req.originalUrl}`, err);
  res.status(500).json({ mensaje: "Error interno del servidor" });
};
