import pool from "../data/db.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import * as modelo from "../models/consultas.model.js";

// Recargo por cada hora que supera las 4 incluidas (mismo valor que el sitio).
const HORAS_INCLUIDAS = 4;
const PRECIO_HORA_ADICIONAL = "120000";

// El dinero se opera en centavos con BigInt, nunca con floats.
const aCentavos = (valor) => {
  const [entera, decimales = ""] = String(valor).split(".");
  return BigInt(entera) * 100n + BigInt(decimales.padEnd(2, "0").slice(0, 2));
};
const deCentavos = (centavos) => {
  const texto = centavos.toString().padStart(3, "0");
  return `${texto.slice(0, -2)}.${texto.slice(-2)}`;
};

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
 */
export const registrar = async (datos) => {
  const idEmpresa = env.idEmpresaConsultas;
  if (!idEmpresa) {
    console.error("[CONSULTAS] Falta ID_EMPRESA_CONSULTAS en el .env del backend");
    throw new AppError(503, "El servicio de consultas no está disponible por el momento");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const resultado = await registrarEnTransaccion(client, idEmpresa, datos);
    await client.query("COMMIT");
    return resultado;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

// Separada para poder probarla dentro de una transacción propia con ROLLBACK.
export const registrarEnTransaccion = async (client, idEmpresa, datos) => {
  if (!(await modelo.empresaActiva(client, idEmpresa))) {
    console.error(`[CONSULTAS] La empresa ${idEmpresa} no existe o está deshabilitada`);
    throw new AppError(503, "El servicio de consultas no está disponible por el momento");
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
    horaFin: sumarHoras(datos.hora_inicio, datos.duracion_horas),
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
