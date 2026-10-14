import { z } from "zod";
import { entero, objetoEstricto, textoRequerido } from "../utils/validaciones.js";

// Consulta pública del sitio (sin login). La empresa NO viene en el body:
// sale de la configuración del servidor (ID_EMPRESA_CONSULTAS).
// El cliente envía nombres de catálogo, nunca precios: el total lo calcula el servidor.

const fechaValida = (valor) => {
  const fecha = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
};

const contacto = objetoEstricto({
  nombre: textoRequerido("El nombre", 80),
  apellido: textoRequerido("El apellido", 80),
  homenajeado: textoRequerido("El homenajeado", 100),
  email: z
    .string({ error: "El email debe ser un texto" })
    .trim()
    .toLowerCase()
    .max(150, "El email admite como máximo 150 caracteres")
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "El email no es válido"),
  // WhatsApp internacional: + opcional, separadores comunes y 7 a 15 dígitos.
  telefono: z
    .string({ error: "El teléfono debe ser un texto" })
    .trim()
    .max(30, "El teléfono admite como máximo 30 caracteres")
    .regex(/^\+?[\d\s().-]+$/, "El teléfono no es válido")
    .refine((v) => {
      const digitos = v.replace(/\D/g, "").length;
      return digitos >= 7 && digitos <= 15;
    }, "El teléfono debe tener entre 7 y 15 dígitos")
});

export const crearConsultaSchema = objetoEstricto({
  experiencia: textoRequerido("La experiencia", 80),
  fecha: z
    .string({ error: "La fecha debe ser un texto" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe tener formato AAAA-MM-DD")
    .refine(fechaValida, "La fecha no es válida"),
  hora_inicio: z
    .string({ error: "La hora debe ser un texto" })
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "La hora debe tener formato HH:MM"),
  duracion_horas: entero("La duración").int("La duración debe ser un entero").min(1).max(24),
  invitados: entero("La cantidad de invitados")
    .int("La cantidad de invitados debe ser un entero")
    .min(1, "Debe haber al menos 1 invitado")
    .max(5000, "La cantidad de invitados es demasiado grande"),
  espacios: z.array(textoRequerido("El espacio", 80)).min(1, "Elegí al menos un espacio").max(20),
  servicios: z
    .array(
      objetoEstricto({
        nombre: textoRequerido("El servicio", 80),
        cantidad: entero("La cantidad").int("La cantidad debe ser un entero").min(1).max(5000)
      })
    )
    .max(50),
  contacto
});
