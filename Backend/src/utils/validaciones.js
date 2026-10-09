import { z } from "zod";

// Bloques reutilizables para los esquemas de validación (zod).

// Mensaje distinto si el campo falta o si vino con un tipo incorrecto.
// campo viene con artículo ("El precio") -> "Falta el precio".
const errorDeTipo = (campo, tipoIncorrecto) => (issue) =>
  issue.input === undefined ? `Falta ${campo.charAt(0).toLowerCase()}${campo.slice(1)}` : tipoIncorrecto;

// Objeto que rechaza campos no declarados (ej: id_empresa en el body).
export const objetoEstricto = (campos) =>
  z.strictObject(campos, {
    error: (issue) =>
      issue.code === "unrecognized_keys" ? `Campos no permitidos: ${issue.keys.join(", ")}` : undefined
  });

// ID de ruta (/recurso/:id). Rechaza "abc", "1.5", "-3" y valores fuera de INT4.
export const idParamSchema = z.object({
  id: z.coerce
    .number({ error: "El id debe ser numérico" })
    .int("El id debe ser un entero")
    .positive("El id debe ser positivo")
    .max(2147483647, "El id está fuera de rango")
});

// Texto obligatorio, sin espacios sobrantes.
export const textoRequerido = (campo, max) =>
  z
    .string({ error: errorDeTipo(campo, `${campo} debe ser un texto`) })
    .trim()
    .min(1, `${campo} no puede estar vacío`)
    .max(max, `${campo} admite como máximo ${max} caracteres`);

// Texto opcional: "" se guarda como NULL; null permite borrar el valor.
export const textoOpcional = (campo, max) =>
  z
    .string({ error: `${campo} debe ser un texto` })
    .trim()
    .max(max, `${campo} admite como máximo ${max} caracteres`)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

/**
 * Precio monetario.
 *
 * Nunca operamos dinero con floats de JS (0.1 + 0.2 !== 0.3). El valor se
 * valida como texto decimal con hasta 2 decimales y se envía a PostgreSQL
 * como string, donde se guarda en NUMERIC(12,2) de forma exacta.
 * Acepta 1500, 1500.5, "1500.50"; rechaza negativos, "1,5", "1e3", 3 decimales.
 * Máximo 8 dígitos enteros porque las columnas son DECIMAL(10,2).
 */
const REGEX_PRECIO = /^\d{1,8}(\.\d{1,2})?$/;

export const precio = (campo = "El precio") =>
  z
    .union([z.string(), z.number()], {
      error: errorDeTipo(campo, `${campo} debe ser un número o un texto numérico`)
    })
    .transform((v) => String(v).trim())
    .refine((v) => REGEX_PRECIO.test(v), {
      message: `${campo} debe ser un importe >= 0 con hasta 2 decimales (ej: 15000.50, máx. 99999999.99)`
    });

export const entero = (campo) =>
  z.number({ error: errorDeTipo(campo, `${campo} debe ser un número`) });

// Para PATCH: exige que el body traiga al menos un campo.
export const alMenosUnCampo = (schema) =>
  schema.refine((datos) => Object.values(datos).some((v) => v !== undefined), {
    message: "Debe enviar al menos un campo para actualizar"
  });
