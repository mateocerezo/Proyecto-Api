import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import catalogosRoutes from "./routes/catalogos.routes.js";
import empresasRoutes from "./routes/empresas.routes.js";
import consultasRoutes from "./routes/consultas.routes.js";
import { manejarErrores, rutaNoEncontrada } from "./middlewares/error.middleware.js";

// Configuración de Express separada del arranque (index.js) para poder
// testear la app sin levantar el servidor.
const app = express();

app.disable("x-powered-by");

// Middlewares globales
app.use(cors());
app.use(express.json({ limit: "100kb" }));

// Rutas
app.use("/api/auth", authRoutes);
app.use("/api/catalogos", catalogosRoutes);
app.use("/api/empresas", empresasRoutes);
app.use("/api/consultas", consultasRoutes);

// 404 y manejador de errores: siempre al final y en este orden
app.use(rutaNoEncontrada);
app.use(manejarErrores);

export default app;
