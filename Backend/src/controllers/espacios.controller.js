import * as servicio from "../services/espacios.service.js";

export const listar = async (req, res) => {
  res.json(await servicio.listar(req.id_empresa));
};

export const obtener = async (req, res) => {
  res.json(await servicio.obtener(req.id_empresa, req.datos.params.id));
};

export const crear = async (req, res) => {
  res.status(201).json(await servicio.crear(req.id_empresa, req.datos.body));
};

export const actualizar = async (req, res) => {
  res.json(await servicio.actualizar(req.id_empresa, req.datos.params.id, req.datos.body));
};

export const eliminar = async (req, res) => {
  await servicio.eliminar(req.id_empresa, req.datos.params.id);
  res.status(204).send();
};
