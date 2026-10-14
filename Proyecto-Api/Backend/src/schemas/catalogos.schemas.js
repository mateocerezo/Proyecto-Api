import { z } from "zod";
import { alMenosUnCampo, entero, objetoEstricto, precio, textoOpcional, textoRequerido } from "../utils/validaciones.js";

// Se usan objetos "strict": cualquier campo no declarado (por ejemplo
// id_empresa) se rechaza con 400. Así un cliente nunca puede inyectar el
// tenant ni columnas que no corresponden.
// Los largos máximos coinciden con las columnas de la base (varchar(80), varchar(255)).

// ---------- Tipos de evento ----------
const tipoEventoCampos = {
  nombre: textoRequerido("El nombre", 80),
  descripcion: textoOpcional("La descripción", 255),
  precio_base: precio("El precio base")
};

export const crearTipoEventoSchema = objetoEstricto(tipoEventoCampos);
export const actualizarTipoEventoSchema = alMenosUnCampo(objetoEstricto(tipoEventoCampos).partial());

// ---------- Espacios ----------
const espacioCampos = {
  nombre: textoRequerido("El nombre", 80),
  descripcion: textoOpcional("La descripción", 255),
  capacidad: entero("La capacidad")
    .int("La capacidad debe ser un entero")
    .positive("La capacidad debe ser mayor a 0")
    .max(100000, "La capacidad es demasiado grande"),
  precio_adicional: precio("El precio adicional")
};

export const crearEspacioSchema = objetoEstricto(espacioCampos);
export const actualizarEspacioSchema = alMenosUnCampo(objetoEstricto(espacioCampos).partial());

// ---------- Servicios ----------
const servicioCampos = {
  nombre: textoRequerido("El nombre", 80),
  descripcion: textoOpcional("La descripción", 255),
  precio: precio("El precio")
};

export const crearServicioSchema = objetoEstricto(servicioCampos);
export const actualizarServicioSchema = alMenosUnCampo(objetoEstricto(servicioCampos).partial());
