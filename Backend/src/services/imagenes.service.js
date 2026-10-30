import { enTransaccion } from "../data/transaccion.js";
import { AppError } from "../utils/AppError.js";
import * as modelo from "../models/imagenes.model.js";
import * as espaciosModel from "../models/espacios.model.js";

export const TAMANO_MAXIMO = 3 * 1024 * 1024;
const MAXIMO_EMPRESA = 10;
const MAXIMO_ESPACIO = 8;

// Se mira el contenido real del archivo, no solo el Content-Type que manda el
// cliente: así no se puede guardar otra cosa haciéndola pasar por imagen.
const FIRMAS = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/webp": (b) => b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP"
};
export const TIPOS_PERMITIDOS = Object.keys(FIRMAS);

export const listar = (idEmpresa) => modelo.listar(idEmpresa);

export const subir = async (idEmpresa, { idEspacio, tipoMime, datos }) => {
  if (!Buffer.isBuffer(datos) || datos.length === 0) {
    throw AppError.badRequest("Envíe la imagen como cuerpo de la petición (JPG, PNG o WEBP)");
  }
  if (!FIRMAS[tipoMime]?.(datos)) {
    throw AppError.badRequest("El archivo no es una imagen JPG, PNG o WEBP válida");
  }

  return enTransaccion(async (client) => {
    if (idEspacio !== null && !(await espaciosModel.buscarPorId(idEmpresa, idEspacio))) {
      throw AppError.notFound("Espacio no encontrado");
    }
    // Se bloquea la fila de la empresa para que dos subidas simultáneas no
    // pasen juntas el límite.
    await client.query("SELECT 1 FROM empresas WHERE id_empresa = $1 FOR UPDATE", [idEmpresa]);
    const maximo = idEspacio === null ? MAXIMO_EMPRESA : MAXIMO_ESPACIO;
    if ((await modelo.contar(client, idEmpresa, idEspacio)) >= maximo) {
      throw AppError.conflict(
        `Se admiten como máximo ${maximo} fotos ${idEspacio === null ? "de la empresa" : "por espacio"}`
      );
    }
    return modelo.crear(client, idEmpresa, { idEspacio, tipoMime, datos });
  });
};

export const eliminar = async (idEmpresa, idImagen) => {
  if (!(await modelo.eliminar(idEmpresa, idImagen))) throw AppError.notFound("Imagen no encontrada");
};

export const obtenerPublica = async (idImagen) => {
  const imagen = await modelo.buscarPublica(idImagen);
  if (!imagen) throw AppError.notFound("Imagen no encontrada");
  return imagen;
};
