import "dotenv/config";
import { env } from "./config/env.js";
import app from "./app.js";

app.listen(env.port, () => {
  console.log(`Servidor escuchando en http://localhost:${env.port}`);
});
