import { z } from "zod";
import { objetoEstricto, textoOpcional, textoRequerido } from "../utils/validaciones.js";

// Los largos máximos coinciden con las columnas de empresas y usuarios.

const email = (campo) =>
  z
    .string({ error: `${campo} es obligatorio` })
    .trim()
    .toLowerCase()
    .max(120, `${campo} admite como máximo 120 caracteres`)
    .pipe(z.email({ error: `${campo} no es válido` }));

// Registro de una empresa por una persona ya logueada en Clerk, que queda como
// su admin. No acepta "activa": toda empresa nace pendiente de aprobación.
// admin es opcional: si no viene, nombre y apellido se toman del perfil de Clerk.
// El email del admin SIEMPRE sale de Clerk (verificado), nunca del body.
export const registrarEmpresaSchema = objetoEstricto({
  empresa: objetoEstricto({
    nombre: textoRequerido("El nombre", 100),
    // Formato 30-12345678-9 o 11 dígitos; se guarda siempre con guiones.
    cuit: z
      .string({ error: "El CUIT es obligatorio" })
      .trim()
      .regex(/^\d{2}-?\d{8}-?\d$/, "El CUIT debe tener 11 dígitos (ej: 30-12345678-9)")
      .transform((v) => {
        const d = v.replace(/-/g, "");
        return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`;
      }),
    email: email("El email de la empresa"),
    telefono: textoOpcional("El teléfono", 30)
  }),
  admin: objetoEstricto({
    nombre: textoRequerido("El nombre", 80),
    apellido: textoRequerido("El apellido", 80)
  }).optional()
});

// GET /api/superadmin/empresas?estado=pendientes|activas|todas
export const listarEmpresasQuerySchema = z.object({
  estado: z
    .enum(["pendientes", "activas", "todas"], { error: "estado debe ser pendientes, activas o todas" })
    .default("pendientes")
});
