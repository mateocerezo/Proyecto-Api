import { z } from "zod";

export const loginSchema = z.object({
  // Se normaliza ANTES de validar el formato (" Admin@X.com " -> "admin@x.com").
  email: z
    .string({ error: "El email es obligatorio" })
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "Email inválido" })),
  password: z
    .string({ error: "La contraseña es obligatoria" })
    .min(1, "La contraseña es obligatoria")
    .max(200, "Contraseña demasiado larga"),
  // Solo necesario si el mismo email/contraseña existe en más de una empresa.
  id_empresa: z
    .number({ error: "id_empresa debe ser un número" })
    .int()
    .positive()
    .optional()
});
