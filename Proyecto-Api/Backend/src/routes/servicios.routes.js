import { Router } from "express";
import * as ctrl from "../controllers/servicios.controller.js";
import { autorizar } from "../middlewares/auth.middleware.js";
import { validar } from "../middlewares/validar.middleware.js";
import { idParamSchema } from "../utils/validaciones.js";
import { actualizarServicioSchema, crearServicioSchema } from "../schemas/catalogos.schemas.js";

const router = Router();

router.get("/", ctrl.listar);
router.get("/:id", validar({ params: idParamSchema }), ctrl.obtener);
router.post("/", autorizar("admin"), validar({ body: crearServicioSchema }), ctrl.crear);
router.patch(
  "/:id",
  autorizar("admin"),
  validar({ params: idParamSchema, body: actualizarServicioSchema }),
  ctrl.actualizar
);
router.delete("/:id", autorizar("admin"), validar({ params: idParamSchema }), ctrl.eliminar);

export default router;
