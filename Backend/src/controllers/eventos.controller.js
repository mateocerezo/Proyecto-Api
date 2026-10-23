import * as servicio from "../services/eventos.service.js";

export const listar = async (req, res) => {
  res.json(await servicio.listar(req.id_empresa, req.datos.query.estado));
};

export const obtener = async (req, res) => {
  res.json(await servicio.obtener(req.id_empresa, req.datos.params.id));
};

export const aceptar = async (req, res) => {
  res.json(
    await servicio.aceptar(req.id_empresa, req.usuario.id_usuario, req.datos.params.id, req.datos.body)
  );
};

export const rechazar = async (req, res) => {
  res.json(await servicio.rechazar(req.id_empresa, req.datos.params.id, req.datos.body));
};
