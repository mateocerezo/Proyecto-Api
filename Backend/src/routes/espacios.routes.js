import { Router } from "express";
import * as ctrl from "../controllers/espacios.controller.js";
import { autorizar } from "../middlewares/auth.middleware.js";
import { validar } from "../middlewares/validar.middleware.js";
import { idParamSchema } from "../utils/validaciones.js";
import { actualizarEspacioSchema, crearEspacioSchema } from "../schemas/catalogos.schemas.js";

const router = Router();

router.get("/", ctrl.listar);
router.get("/:id", validar({ params: idParamSchema }), ctrl.obtener);
router.post("/", autorizar("admin"), validar({ body: crearEspacioSchema }), ctrl.crear);
router.patch(
  "/:id",
  autorizar("admin"),
  validar({ params: idParamSchema, body: actualizarEspacioSchema }),
  ctrl.actualizar
);
router.delete("/:id", autorizar("admin"), validar({ params: idParamSchema }), ctrl.eliminar);

export default router;
