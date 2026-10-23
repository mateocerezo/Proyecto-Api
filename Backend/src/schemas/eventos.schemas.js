import { z } from "zod";
import { objetoEstricto, precio, textoOpcional, textoRequerido } from "../utils/validaciones.js";

export const ESTADOS_EVENTO = ["consultado", "reservado", "cancelado"];

// GET /api/eventos?estado=consultado  (sin estado: todos)
export const listarEventosQuerySchema = z.object({
  estado: z.enum(ESTADOS_EVENTO, { error: `estado debe ser uno de: ${ESTADOS_EVENTO.join(", ")}` }).optional()
});

// Aceptar = registrar la seña. Largos según la tabla pagos (varchar(20)).
export const aceptarSolicitudSchema = objetoEstricto({
  monto: precio("El monto de la seña").refine((v) => Number(v) > 0, {
    message: "El monto de la seña debe ser mayor a 0"
  }),
  metodo_pago: textoRequerido("El método de pago", 20),
  concepto: textoOpcional("El concepto", 20)
});

export const rechazarSolicitudSchema = objetoEstricto({
  motivo: textoOpcional("El motivo", 500)
});
