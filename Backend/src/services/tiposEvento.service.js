import { AppError } from "../utils/AppError.js";
import { traducirErrorPg } from "../utils/pgErrores.js";
import * as modelo from "../models/tiposEvento.model.js";

// Capa de negocio: decide qué significa "no encontrado", traduce
// conflictos de la base a mensajes claros y orquesta los modelos.

const NO_ENCONTRADO = "Tipo de evento no encontrado";
const MENSAJES_PG = {
  duplicado: "Ya existe un tipo de evento con ese nombre",
  enUso: "No se puede eliminar: el tipo de evento está asociado a eventos registrados"
};

export const listar = (idEmpresa) => modelo.listar(idEmpresa);

export const obtener = async (idEmpresa, id) => {
  const tipo = await modelo.buscarPorId(idEmpresa, id);
  if (!tipo) throw AppError.notFound(NO_ENCONTRADO);
  return tipo;
};

export const crear = async (idEmpresa, datos) => {
  try {
    return await modelo.crear(idEmpresa, datos);
  } catch (error) {
    throw traducirErrorPg(error, MENSAJES_PG);
  }
};

export const actualizar = async (idEmpresa, id, cambios) => {
  let tipo;
  try {
    tipo = await modelo.actualizar(idEmpresa, id, cambios);
  } catch (error) {
    throw traducirErrorPg(error, MENSAJES_PG);
  }
  if (!tipo) throw AppError.notFound(NO_ENCONTRADO);
  return tipo;
};

export const eliminar = async (idEmpresa, id) => {
  let eliminado;
  try {
    eliminado = await modelo.eliminar(idEmpresa, id);
  } catch (error) {
    throw traducirErrorPg(error, MENSAJES_PG);
  }
  if (!eliminado) throw AppError.notFound(NO_ENCONTRADO);
};
