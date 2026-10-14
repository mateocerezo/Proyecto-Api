import { AppError } from "../utils/AppError.js";

/**
 * Valida params, query y/o body con esquemas zod.
 * Los datos ya validados y transformados quedan en req.datos.{params,query,body};
 * los controladores deben usar req.datos y NO req.body crudo.
 *
 * Uso: router.post("/", validar({ body: crearSchema }), controlador)
 */
export const validar = (esquemas) => (req, res, next) => {
  const datos = {};
  const errores = [];

  for (const parte of ["params", "query", "body"]) {
    if (!esquemas[parte]) continue;

    const resultado = esquemas[parte].safeParse(req[parte] ?? {});
    if (resultado.success) {
      datos[parte] = resultado.data;
    } else {
      for (const issue of resultado.error.issues) {
        errores.push({
          campo: [parte, ...issue.path].join("."),
          mensaje: issue.message
        });
      }
    }
  }

  if (errores.length > 0) {
    throw AppError.badRequest("Datos inválidos", errores);
  }

  req.datos = datos;
  next();
};
