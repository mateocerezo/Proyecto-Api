import "dotenv/config";
import express from "express";
import cors from "cors";
import empresasRouter from "./routes/empresas.routes.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

app.use("/api/empresas", empresasRouter);