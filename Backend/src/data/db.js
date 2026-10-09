import pg from "pg";

// Nota sobre precios: pg devuelve las columnas NUMERIC como string
// ("15000.00") a propósito, para no perder precisión. Se mantiene así:
// el dinero viaja como string en la API y nunca pasa por floats de JS.

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Sin este listener, un error en una conexión inactiva (ej: reinicio de
// PostgreSQL) tumba todo el proceso de Node.
pool.on("error", (error) => {
  console.error("[DB] Error inesperado en una conexión inactiva:", error.message);
});

export default pool;
