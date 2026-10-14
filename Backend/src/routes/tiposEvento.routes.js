import { Router } from "express";
import * as ctrl from "../controllers/tiposEvento.controller.js";
import { autorizar } from "../middlewares/auth.middleware.js";
import { validar } from "../middlewares/validar.middleware.js";
import { idParamSchema } from "../utils/validaciones.js";
import { actualizarTipoEventoSchema, crearTipoEventoSchema } from "../schemas/catalogos.schemas.js";

// Autenticación + tenant se aplican en catalogos.routes.js.
// Lectura: cualquier usuario de la empresa. Escritura: solo admin.
const router = Router();

router.get("/", ctrl.listar);
router.get("/:id", validar({ params: idParamSchema }), ctrl.obtener);
router.post("/", autorizar("admin"), validar({ body: crearTipoEventoSchema }), ctrl.crear);
router.patch(
  "/:id",
  autorizar("admin"),
  validar({ params: idParamSchema, body: actualizarTipoEventoSchema }),
  ctrl.actualizar
);
router.delete("/:id", autorizar("admin"), validar({ params: idParamSchema }), ctrl.eliminar);

export default router;
