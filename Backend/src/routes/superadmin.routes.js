import { Router } from "express";
import * as ctrl from "../controllers/empresas.controller.js";
import { autenticarSuperAdmin } from "../middlewares/auth.middleware.js";
import { validar } from "../middlewares/validar.middleware.js";
import { idParamSchema } from "../utils/validaciones.js";
import { listarEmpresasQuerySchema } from "../schemas/empresas.schemas.js";

// Panel del SuperAdmin global. Todo exige su sesión de Clerk.
const router = Router();

router.use(autenticarSuperAdmin);

router.get("/empresas", validar({ query: listarEmpresasQuerySchema }), ctrl.listar);
router.patch("/empresas/:id/aprobar", validar({ params: idParamSchema }), ctrl.aprobar);
router.patch("/empresas/:id/activar", validar({ params: idParamSchema }), ctrl.activar);
router.patch("/empresas/:id/desactivar", validar({ params: idParamSchema }), ctrl.desactivar);
router.delete("/empresas/:id", validar({ params: idParamSchema }), ctrl.rechazar);

export default router;
