import { AppError } from "../utils/AppError.js";
import { traducirErrorPg } from "../utils/pgErrores.js";
import * as modelo from "../models/espacios.model.js";

const NO_ENCONTRADO = "Espacio no encontrado";
const MENSAJES_PG = {
  duplicado: "Ya existe un espacio con ese nombre",
  enUso: "No se puede eliminar: el espacio está asociado a eventos registrados"
};

export const listar = (idEmpresa) => modelo.listar(idEmpresa);

export const obtener = async (idEmpresa, id) => {
  const espacio = await modelo.buscarPorId(idEmpresa, id);
  if (!espacio) throw AppError.notFound(NO_ENCONTRADO);
  return espacio;
};

export const crear = async (idEmpresa, datos) => {
  try {
    return await modelo.crear(idEmpresa, datos);
  } catch (error) {
    throw traducirErrorPg(error, MENSAJES_PG);
  }
};

export const actualizar = async (idEmpresa, id, cambios) => {
  let espacio;
  try {
    espacio = await modelo.actualizar(idEmpresa, id, cambios);
  } catch (error) {
    throw traducirErrorPg(error, MENSAJES_PG);
  }
  if (!espacio) throw AppError.notFound(NO_ENCONTRADO);
  return espacio;
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
