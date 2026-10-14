import { Router } from "express";
import * as ctrl from "../controllers/consultas.controller.js";
import { validar } from "../middlewares/validar.middleware.js";
import { crearConsultaSchema } from "../schemas/consultas.schemas.js";

// Ruta PÚBLICA (la usa el formulario del sitio, sin login).
const router = Router();

router.post("/", validar({ body: crearConsultaSchema }), ctrl.crear);

export default router;
