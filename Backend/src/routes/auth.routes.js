import { Router } from "express";
import { login, perfil } from "../controllers/auth.controller.js";
import { autenticar } from "../middlewares/auth.middleware.js";
import { resolverEmpresa } from "../middlewares/tenant.middleware.js";
import { validar } from "../middlewares/validar.middleware.js";
import { loginSchema } from "../schemas/auth.schemas.js";

const router = Router();

router.post("/login", validar({ body: loginSchema }), login);
router.get("/me", autenticar, resolverEmpresa, perfil);

export default router;
