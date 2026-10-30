import express, { Router } from "express";
import * as ctrl from "../controllers/empresas.controller.js";
import * as imagenes from "../controllers/imagenes.controller.js";
import { autenticar, autorizar } from "../middlewares/auth.middleware.js";
import { resolverEmpresa } from "../middlewares/tenant.middleware.js";
import { validar } from "../middlewares/validar.middleware.js";
import { idParamSchema } from "../utils/validaciones.js";
import { actualizarPerfilSchema, subirImagenQuerySchema } from "../schemas/empresas.schemas.js";
import { TAMANO_MAXIMO, TIPOS_PERMITIDOS } from "../services/imagenes.service.js";

// Perfil (propuesta) de la empresa del usuario logueado. La empresa sale de
// la sesión (resolverEmpresa), nunca de la URL: no hay forma de editar otra.
const router = Router();

router.use(autenticar, resolverEmpresa);

router.get("/", ctrl.perfil);
router.patch("/", autorizar("admin"), validar({ body: actualizarPerfilSchema }), ctrl.actualizarPerfil);

// Fotos: el archivo viaja crudo en el body (Content-Type image/jpeg|png|webp).
// ?espacio=ID la asocia a un salón; sin él es una foto de la empresa.
router.get("/imagenes", imagenes.listar);
router.post(
  "/imagenes",
  autorizar("admin"),
  express.raw({ type: TIPOS_PERMITIDOS, limit: TAMANO_MAXIMO }),
  validar({ query: subirImagenQuerySchema }),
  imagenes.subir
);
router.delete("/imagenes/:id", autorizar("admin"), validar({ params: idParamSchema }), imagenes.eliminar);

export default router;
