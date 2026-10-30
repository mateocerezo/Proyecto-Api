import * as servicio from "../services/imagenes.service.js";

export const listar = async (req, res) => {
  res.json(await servicio.listar(req.id_empresa));
};

export const subir = async (req, res) => {
  const imagen = await servicio.subir(req.id_empresa, {
    idEspacio: req.datos.query.espacio ?? null,
    tipoMime: req.get("content-type")?.split(";")[0].trim().toLowerCase(),
    datos: req.body
  });
  res.status(201).json(imagen);
};

export const eliminar = async (req, res) => {
  await servicio.eliminar(req.id_empresa, req.datos.params.id);
  res.status(204).send();
};

// Público: las fotos no cambian (cada subida es un id nuevo), así que el
// navegador puede cachearlas sin volver a pedirlas.
export const ver = async (req, res) => {
  const imagen = await servicio.obtenerPublica(req.datos.params.id);
  res.set({
    "Content-Type": imagen.tipo_mime,
    "Cache-Control": "public, max-age=604800, immutable",
    "X-Content-Type-Options": "nosniff"
  });
  res.send(imagen.datos);
};
