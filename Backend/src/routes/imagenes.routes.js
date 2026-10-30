import { Router } from "express";
import * as ctrl from "../controllers/imagenes.controller.js";
import { validar } from "../middlewares/validar.middleware.js";
import { idParamSchema } from "../utils/validaciones.js";

// Público: sirve los bytes de una foto de una empresa activa (<img src>).
const router = Router();

router.get("/:id", validar({ params: idParamSchema }), ctrl.ver);

export default router;
