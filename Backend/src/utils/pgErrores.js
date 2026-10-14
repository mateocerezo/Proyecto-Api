import { AppError } from "./AppError.js";

// Códigos de error de PostgreSQL que nos interesan.
// https://www.postgresql.org/docs/current/errcodes-appendix.html
export const PG = {
  UNIQUE_VIOLATION: "23505",
  FOREIGN_KEY_VIOLATION: "23503",
  CHECK_VIOLATION: "23514",
  NOT_NULL_VIOLATION: "23502",
  INVALID_TEXT_REPRESENTATION: "22P02",
  NUMERIC_OUT_OF_RANGE: "22003"
};

/**
 * Traduce errores de PostgreSQL a mensajes de negocio específicos.
 * Si el error no aplica, lo devuelve tal cual para que lo maneje el
 * middleware global de errores.
 *
 * @param {Error} error
 * @param {{ duplicado?: string, enUso?: string }} mensajes
 */
export const traducirErrorPg = (error, { duplicado, enUso } = {}) => {
  if (error.code === PG.UNIQUE_VIOLATION && duplicado) {
    return AppError.conflict(duplicado);
  }
  if (error.code === PG.FOREIGN_KEY_VIOLATION && enUso) {
    return AppError.conflict(enUso);
  }
  return error;
};
