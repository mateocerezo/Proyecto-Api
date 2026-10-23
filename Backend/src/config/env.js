// Configuración centralizada. Falla al arrancar si falta algo crítico,
// en lugar de fallar en el primer request.

const requerida = (nombre) => {
  const valor = process.env[nombre]?.trim();
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre} (revisá el archivo .env)`);
  }
  return valor;
};

// El SDK de Clerk lee estas dos directamente de process.env; se validan acá
// para que el servidor no arranque sin ellas.
requerida("CLERK_PUBLISHABLE_KEY");
requerida("CLERK_SECRET_KEY");

export const env = {
  port: Number(process.env.PORT) || 3000,
  // Empresa por defecto para consultas públicas que no indican id_empresa
  // (compatibilidad con el formulario actual del sitio).
  idEmpresaConsultas: Number.parseInt(process.env.ID_EMPRESA_CONSULTAS, 10) || null,
  // Usuario de Clerk del SuperAdmin global (no pertenece a ninguna empresa).
  superAdminClerkId: requerida("SUPERADMIN_CLERK_USER_ID"),
  // Orígenes del frontend autorizados a usar tokens de Clerk contra esta API.
  clerkAuthorizedParties: (process.env.CLERK_AUTHORIZED_PARTIES ?? "")
    .split(",")
    .map((origen) => origen.trim().replace(/\/$/, ""))
    .filter(Boolean)
};
