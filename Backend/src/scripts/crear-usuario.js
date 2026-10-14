// Alta de usuarios por consola (para crear el primer admin de cada empresa).
// Si el rol no existe en la empresa, se crea.
//
// Uso:
//   npm run crear-usuario -- --empresa 1 --nombre "Juan" --apellido "Pérez" \
//     --email admin@eventosdelcentro.com --password "Secreta123" --rol admin

import "dotenv/config";
import { parseArgs } from "node:util";
import pool from "../data/db.js";
import { registrarUsuario } from "../services/auth.service.js";

const { values } = parseArgs({
  options: {
    empresa: { type: "string" },
    nombre: { type: "string" },
    apellido: { type: "string" },
    email: { type: "string" },
    password: { type: "string" },
    rol: { type: "string", default: "operador" }
  }
});

const idEmpresa = Number(values.empresa);
const errores = [];
if (!Number.isInteger(idEmpresa) || idEmpresa <= 0) errores.push("--empresa debe ser un id numérico");
if (!values.nombre) errores.push("--nombre es obligatorio");
if (!values.apellido) errores.push("--apellido es obligatorio");
if (!values.email) errores.push("--email es obligatorio");
if (!values.password || values.password.length < 8) errores.push("--password debe tener al menos 8 caracteres");

if (errores.length > 0) {
  console.error(errores.join("\n"));
  process.exit(1);
}

try {
  const usuario = await registrarUsuario({
    idEmpresa,
    nombreRol: values.rol.trim().toLowerCase(),
    nombre: values.nombre,
    apellido: values.apellido,
    email: values.email.trim().toLowerCase(),
    password: values.password
  });
  console.log("Usuario creado:", usuario);
} catch (error) {
  console.error("No se pudo crear el usuario:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
