import { Router } from "express";
import * as ctrl from "../controllers/eventos.controller.js";
import { autenticar, autorizar } from "../middlewares/auth.middleware.js";
import { resolverEmpresa } from "../middlewares/tenant.middleware.js";
import { validar } from "../middlewares/validar.middleware.js";
import { idParamSchema } from "../utils/validaciones.js";
import {
  aceptarSolicitudSchema,
  listarEventosQuerySchema,
  rechazarSolicitudSchema
} from "../schemas/eventos.schemas.js";

// Panel de la empresa: eventos y solicitudes recibidas desde la landing.
// Lectura: cualquier usuario de la empresa. Aceptar/rechazar: solo admin.
const router = Router();

router.use(autenticar, resolverEmpresa);

router.get("/", validar({ query: listarEventosQuerySchema }), ctrl.listar);
router.get("/:id", validar({ params: idParamSchema }), ctrl.obtener);
router.post(
  "/:id/aceptar",
  autorizar("admin"),
  validar({ params: idParamSchema, body: aceptarSolicitudSchema }),
  ctrl.aceptar
);
router.post(
  "/:id/rechazar",
  autorizar("admin"),
  validar({ params: idParamSchema, body: rechazarSolicitudSchema }),
  ctrl.rechazar
);

export default router;
