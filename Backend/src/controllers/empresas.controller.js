import * as servicio from "../services/empresas.service.js";

// ---------- Público ----------

export const registrar = async (req, res) => {
  const resultado = await servicio.registrar(req.clerkUserId, req.datos.body);
  res.status(201).json({
    mensaje: "Registro recibido. La empresa quedará habilitada cuando la apruebe un administrador.",
    ...resultado
  });
};

export const listarActivas = async (req, res) => {
  res.json(await servicio.listarActivas());
};

export const catalogo = async (req, res) => {
  res.json(await servicio.catalogoPublico(req.datos.params.id));
};

// ---------- SuperAdmin ----------

export const listar = async (req, res) => {
  res.json(await servicio.listar(req.datos.query.estado));
};

export const aprobar = async (req, res) => {
  res.json(await servicio.aprobar(req.datos.params.id));
};

export const activar = async (req, res) => {
  res.json(await servicio.activar(req.datos.params.id));
};

export const desactivar = async (req, res) => {
  res.json(await servicio.desactivar(req.datos.params.id));
};

export const rechazar = async (req, res) => {
  await servicio.rechazar(req.datos.params.id);
  res.status(204).send();
};
