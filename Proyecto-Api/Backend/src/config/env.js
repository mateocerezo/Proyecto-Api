// Configuración centralizada. Falla al arrancar si falta algo crítico,
// en lugar de fallar en el primer request.

const requerida = (nombre) => {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre} (revisá el archivo .env)`);
  }
  return valor;
};

const jwtSecret = requerida("JWT_SECRET");
if (jwtSecret.length < 32) {
  throw new Error("JWT_SECRET debe tener al menos 32 caracteres");
}

export const env = {
  port: Number(process.env.PORT) || 3000,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h"
};
