// Vincula un usuario existente de la base con su cuenta de Clerk
// (para usuarios creados antes de usar Clerk, o agregados a mano).
// La persona primero crea su cuenta en Clerk; su User ID (user_...) está en
// Dashboard de Clerk -> Users.
//
// Uso:
//   npm run vincular-clerk -- --usuario 5 --clerk user_2abc...

import "dotenv/config";
import { parseArgs } from "node:util";
import { createClerkClient } from "@clerk/express";
import pool from "../data/db.js";

const { values } = parseArgs({
  options: {
    usuario: { type: "string" },
    clerk: { type: "string" }
  }
});

const idUsuario = Number(values.usuario);
if (!Number.isInteger(idUsuario) || idUsuario <= 0 || !values.clerk?.startsWith("user_")) {
  console.error("Uso: npm run vincular-clerk -- --usuario <id_usuario> --clerk <user_...>");
  process.exit(1);
}

try {
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  const cuenta = await clerk.users.getUser(values.clerk);

  const { rows } = await pool.query(
    `UPDATE usuarios SET clerk_user_id = $2
      WHERE id_usuario = $1
     RETURNING id_usuario, id_empresa, nombre, apellido, email`,
    [idUsuario, cuenta.id]
  );
  if (rows.length === 0) {
    console.error(`No existe el usuario ${idUsuario}`);
    process.exitCode = 1;
  } else {
    console.log("Vinculado:", rows[0], "->", cuenta.id, cuenta.primaryEmailAddress?.emailAddress);
  }
} catch (error) {
  const mensaje =
    error.constraint === "usuarios_clerk_user_id_key"
      ? "Esa cuenta de Clerk ya está vinculada a otro usuario"
      : error.status === 404
        ? "No existe esa cuenta en Clerk"
        : error.message;
  console.error("No se pudo vincular:", mensaje);
  process.exitCode = 1;
} finally {
  await pool.end();
}
