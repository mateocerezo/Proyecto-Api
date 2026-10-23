import pool from "./db.js";

/**
 * Ejecuta fn(client) dentro de una transacción: COMMIT si termina bien,
 * ROLLBACK si lanza. Todas las consultas de fn deben usar ese client.
 */
export const enTransaccion = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const resultado = await fn(client);
    await client.query("COMMIT");
    return resultado;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};
