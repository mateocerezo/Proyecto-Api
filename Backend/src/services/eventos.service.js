import { enTransaccion } from "../data/transaccion.js";
import { AppError } from "../utils/AppError.js";
import { aCentavos } from "../utils/dinero.js";
import * as modelo from "../models/eventos.model.js";

const NO_ENCONTRADO = "Evento no encontrado";

// Ciclo de una solicitud: consultado -> reservado (con seña) | cancelado.
const CONSULTADO = "consultado";
const RESERVADO = "reservado";
const CANCELADO = "cancelado";

const CONCEPTO_SENA = "seña";
// La seña se registra cuando la empresa ya la cobró.
const ESTADO_PAGO_SENA = "aprobado";

export const listar = (idEmpresa, estado) => modelo.listar(idEmpresa, estado ?? null);

export const obtener = async (idEmpresa, id) => {
  const evento = await modelo.buscarPorId(idEmpresa, id);
  if (!evento) throw AppError.notFound(NO_ENCONTRADO);
  return evento;
};

// Bloquea el evento y verifica que siga pendiente de respuesta.
const bloquearSolicitud = async (client, idEmpresa, id) => {
  const evento = await modelo.bloquear(client, idEmpresa, id);
  if (!evento) throw AppError.notFound(NO_ENCONTRADO);
  if (evento.estado !== CONSULTADO) {
    throw AppError.conflict(`La solicitud ya fue respondida (estado: ${evento.estado})`);
  }
  return evento;
};

// Rechaza la aceptación si algún espacio del evento ya está reservado por otro
// evento en un horario superpuesto.
const verificarDisponibilidad = async (client, idEmpresa, evento) => {
  const idsEspacio = await modelo.idsEspacios(client, idEmpresa, evento.id_evento);
  if (idsEspacio.length === 0) return;

  await modelo.bloquearEspacios(client, idEmpresa, idsEspacio);
  const conflictos = await modelo.conflictosDeEspacio(client, idEmpresa, {
    fecha: evento.fecha_evento,
    horaInicio: evento.hora_inicio,
    horaFin: evento.hora_fin,
    idsEspacio,
    excluirEvento: evento.id_evento
  });

  if (conflictos.length > 0) {
    throw new AppError(
      409,
      "Los espacios ya están reservados para otro evento en ese horario",
      conflictos.map((c) => ({
        id_evento: c.id_evento,
        nombre: c.nombre,
        fecha_evento: c.fecha_evento,
        horario: `${c.hora_inicio} a ${c.hora_fin}`,
        espacios: c.espacios
      }))
    );
  }
};

/**
 * Acepta una solicitud: verifica que los espacios sigan libres, registra la
 * seña en pagos y pasa el evento a "reservado", en una sola transacción.
 */
export const aceptar = async (idEmpresa, idUsuario, id, { monto, metodo_pago, concepto }) => {
  await enTransaccion(async (client) => {
    const evento = await bloquearSolicitud(client, idEmpresa, id);

    if (aCentavos(monto) > aCentavos(evento.monto_total)) {
      throw AppError.badRequest(`La seña no puede superar el total del evento (${evento.monto_total})`);
    }

    await verificarDisponibilidad(client, idEmpresa, evento);

    await modelo.registrarPago(client, idEmpresa, {
      idEvento: id,
      idUsuario,
      monto,
      metodoPago: metodo_pago,
      concepto: concepto ?? CONCEPTO_SENA,
      estado: ESTADO_PAGO_SENA
    });
    await modelo.cambiarEstado(client, idEmpresa, id, RESERVADO);
  });
  return obtener(idEmpresa, id);
};

export const rechazar = async (idEmpresa, id, { motivo }) => {
  await enTransaccion(async (client) => {
    await bloquearSolicitud(client, idEmpresa, id);
    await modelo.cambiarEstado(client, idEmpresa, id, CANCELADO, motivo ? `Rechazada: ${motivo}` : null);
  });
  return obtener(idEmpresa, id);
};
