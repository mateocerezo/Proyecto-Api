import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { env } from "./config/env.js";
import authRoutes from "./routes/auth.routes.js";
import catalogosRoutes from "./routes/catalogos.routes.js";
import empresasRoutes from "./routes/empresas.routes.js";
import miEmpresaRoutes from "./routes/miEmpresa.routes.js";
import imagenesRoutes from "./routes/imagenes.routes.js";
import consultasRoutes from "./routes/consultas.routes.js";
import eventosRoutes from "./routes/eventos.routes.js";
import superadminRoutes from "./routes/superadmin.routes.js";
import { manejarErrores, rutaNoEncontrada } from "./middlewares/error.middleware.js";

// Configuración de Express separada del arranque (index.js) para poder
// testear la app sin levantar el servidor.
const app = express();

app.disable("x-powered-by");

// Middlewares globales (siempre ANTES de las rutas)
app.use(cors());
app.use(express.json({ limit: "100kb" }));
// Clerk: si el request trae un token de sesión lo verifica y deja el resultado
// disponible para getAuth(req). No bloquea nada: las rutas privadas lo exigen
// con autenticar / autenticarSuperAdmin.
app.use(clerkMiddleware({ authorizedParties: env.clerkAuthorizedParties }));

// Rutas
app.use("/api/auth", authRoutes);
app.use("/api/catalogos", catalogosRoutes);
app.use("/api/empresas", empresasRoutes);
app.use("/api/mi-empresa", miEmpresaRoutes);
app.use("/api/imagenes", imagenesRoutes);
app.use("/api/consultas", consultasRoutes);
app.use("/api/eventos", eventosRoutes);
app.use("/api/superadmin", superadminRoutes);

// 404 y manejador de errores: siempre al final y en este orden
app.use(rutaNoEncontrada);
app.use(manejarErrores);

export default app;
