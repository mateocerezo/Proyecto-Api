import { Router } from "express";
import { perfil } from "../controllers/auth.controller.js";
import { autenticar, autenticarSuperAdmin } from "../middlewares/auth.middleware.js";
import { resolverEmpresa } from "../middlewares/tenant.middleware.js";

// El login lo hace el frontend con Clerk; acá solo se consulta la sesión.
const router = Router();

// Usuario de empresa. 403 con codigo SIN_EMPRESA / EMPRESA_INACTIVA / USUARIO_INACTIVO
// le indica al frontend si mostrar el registro o el aviso de "pendiente".
router.get("/me", autenticar, resolverEmpresa, perfil);

// SuperAdmin: 200 si la sesión es la suya, 403 si no.
router.get("/superadmin", autenticarSuperAdmin, perfil);

export default router;
