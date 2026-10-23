import { Router } from "express";
import * as ctrl from "../controllers/empresas.controller.js";
import { autenticar } from "../middlewares/auth.middleware.js";
import { validar } from "../middlewares/validar.middleware.js";
import { idParamSchema } from "../utils/validaciones.js";
import { registrarEmpresaSchema } from "../schemas/empresas.schemas.js";

// Rutas de la landing. Las de lectura son públicas y solo exponen empresas
// activas; el registro exige sesión de Clerk (quien registra queda como admin).
// La gestión (aprobar, desactivar...) está en superadmin.routes.js.
const router = Router();

router.get("/", ctrl.listarActivas);
router.get("/:id/catalogo", validar({ params: idParamSchema }), ctrl.catalogo);
router.post("/registro", autenticar, validar({ body: registrarEmpresaSchema }), ctrl.registrar);

export default router;
