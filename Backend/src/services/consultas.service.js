import { env } from "../config/env.js";
import { enTransaccion } from "../data/transaccion.js";
import { AppError } from "../utils/AppError.js";
import { aCentavos, deCentavos } from "../utils/dinero.js";
import * as modelo from "../models/consultas.model.js";
import { conflictosDeEspacio } from "../models/eventos.model.js";

// Recargo por cada hora que supera las 4 incluidas (mismo valor que el sitio).
const HORAS_INCLUIDAS = 4;
const PRECIO_HORA_ADICIONAL = "120000";

const sumarHoras = (hora, horas) => {
  const [h, m] = hora.split(":").map(Number);
  const total = (h * 60 + m + horas * 60) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

const sinDuplicados = (nombres) => [...new Map(nombres.map((n) => [n.toLowerCase(), n])).values()];

/**
 * Registra una consulta pública como evento en estado "consultado":
 * cliente + evento + espacios + servicios en UNA transacción (o todo o nada).
 * Los precios salen de la base; el cliente solo indica nombres y cantidades.
 *
 * La empresa la elige el cliente (id_empresa) desde el catálogo público. Si no
 * la envía se usa ID_EMPRESA_CONSULTAS, para no romper el formulario actual.
 */
export const registrar = async ({ id_empresa, ...datos }) => {
  const idEmpresa = id_empresa ?? env.idEmpresaConsultas;
  if (!idEmpresa) {
    throw AppError.badRequest("Debe indicar id_empresa");
  }
  return enTransaccion((client) => registrarEnTransaccion(client, idEmpresa, datos));
};

// Separada para poder probarla dentro de una transacción propia con ROLLBACK.
export const registrarEnTransaccion = async (client, idEmpresa, datos) => {
  // Una empresa pendiente o deshabilitada no recibe consultas.
  if (!(await modelo.empresaActiva(client, idEmpresa))) {
    throw AppError.notFound("Empresa no encontrada");
  }

  const tipo = await modelo.tipoEventoPorNombre(client, idEmpresa, datos.experiencia);
  if (!tipo) throw AppError.badRequest(`La experiencia "${datos.experiencia}" no existe`);

  const nombresEspacios = sinDuplicados(datos.espacios);
  const espacios = await modelo.espaciosPorNombre(client, idEmpresa, nombresEspacios);
  const faltaEspacio = nombresEspacios.find(
    (n) => !espacios.some((e) => e.nombre.toLowerCase() === n.toLowerCase())
  );
  if (faltaEspacio) throw AppError.badRequest(`El espacio "${faltaEspacio}" no existe`);

  const capacidad = espacios.reduce((suma, e) => suma + e.capacidad, 0);
  if (capacidad < datos.invitados) {
    throw AppError.badRequest(
      `Los espacios elegidos admiten ${capacidad} personas y se indicaron ${datos.invitados} invitados`
    );
  }

  // No se aceptan consultas para espacios ya reservados en ese horario. No se
  // muestra qué evento ocupa el lugar: el que consulta es un tercero.
  const horaFin = sumarHoras(datos.hora_inicio, datos.duracion_horas);
  const ocupados = await conflictosDeEspacio(client, idEmpresa, {
    fecha: datos.fecha,
    horaInicio: datos.hora_inicio,
    horaFin,
    idsEspacio: espacios.map((e) => e.id_espacio)
  });
  if (ocupados.length > 0) {
    const nombres = [...new Set(ocupados.flatMap((c) => c.espacios))].join(", ");
    throw AppError.conflict(`No hay disponibilidad en esa fecha y horario para: ${nombres}`);
  }

  const pedidos = new Map();
  for (const s of datos.servicios) {
    const clave = s.nombre.toLowerCase();
    pedidos.set(clave, { nombre: s.nombre, cantidad: (pedidos.get(clave)?.cantidad ?? 0) + s.cantidad });
  }
  const catalogoServicios = pedidos.size
    ? await modelo.serviciosPorNombre(client, idEmpresa, [...pedidos.values()].map((p) => p.nombre))
    : [];
  const servicios = [...pedidos.entries()].map(([clave, pedido]) => {
    const encontrado = catalogoServicios.find((s) => s.nombre.toLowerCase() === clave);
    if (!encontrado) throw AppError.badRequest(`El servicio "${pedido.nombre}" no existe`);
    return {
      idServicio: encontrado.id_servicio,
      cantidad: pedido.cantidad,
      precioUnitario: encontrado.precio
    };
  });

  const idUsuario = await modelo.usuarioResponsable(client, idEmpresa);
  if (!idUsuario) {
    console.error(`[CONSULTAS] La empresa ${idEmpresa} no tiene usuarios activos para asignar la consulta`);
    throw new AppError(503, "El servicio de consultas no está disponible por el momento");
  }

  const horasAdicionales = Math.max(0, datos.duracion_horas - HORAS_INCLUIDAS);
  const total =
    aCentavos(tipo.precio_base) +
    espacios.reduce((suma, e) => suma + aCentavos(e.precio_adicional), 0n) +
    servicios.reduce((suma, s) => suma + aCentavos(s.precioUnitario) * BigInt(s.cantidad), 0n) +
    aCentavos(PRECIO_HORA_ADICIONAL) * BigInt(horasAdicionales);

  const { contacto } = datos;
  const idCliente =
    (await modelo.buscarClientePorEmail(client, idEmpresa, contacto.email)) ??
    (await modelo.crearCliente(client, idEmpresa, contacto));

  const evento = await modelo.crearEvento(client, idEmpresa, {
    idCliente,
    idTipoEvento: tipo.id_tipo_evento,
    idUsuario,
    nombre: `Fiesta de ${contacto.homenajeado}`.slice(0, 150),
    homenajeado: contacto.homenajeado,
    fecha: datos.fecha,
    horaInicio: datos.hora_inicio,
    horaFin,
    invitados: datos.invitados,
    montoTotal: deCentavos(total),
    observaciones:
      `Consulta web. Experiencia: ${tipo.nombre}. Duración: ${datos.duracion_horas} h. ` +
      `WhatsApp: ${contacto.telefono}. Email: ${contacto.email}.`
  });

  await modelo.vincularEspacios(client, idEmpresa, evento.id_evento, espacios.map((e) => e.id_espacio));
  await modelo.vincularServicios(client, idEmpresa, evento.id_evento, servicios);

  return evento;
};
