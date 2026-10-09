import { Router } from "express";
import { autenticar } from "../middlewares/auth.middleware.js";
import { resolverEmpresa } from "../middlewares/tenant.middleware.js";
import tiposEventoRoutes from "./tiposEvento.routes.js";
import espaciosRoutes from "./espacios.routes.js";
import serviciosRoutes from "./servicios.routes.js";

// Todo lo que cuelga de /api/catalogos exige token válido y queda
// acotado a la empresa del usuario (req.id_empresa).
const router = Router();

router.use(autenticar, resolverEmpresa);

router.use("/tipos-evento", tiposEventoRoutes);
router.use("/espacios", espaciosRoutes);
router.use("/servicios", serviciosRoutes);

export default router;
