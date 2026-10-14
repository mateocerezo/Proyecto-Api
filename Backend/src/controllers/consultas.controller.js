import * as servicio from "../services/consultas.service.js";

export const crear = async (req, res) => {
  const evento = await servicio.registrar(req.datos.body);
  res.status(201).json(evento);
};
