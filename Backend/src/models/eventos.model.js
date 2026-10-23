import pool from "../data/db.js";
import { exigirEmpresa } from "../utils/sql.js";

// Todas las consultas filtran por id_empresa: un evento de otra empresa se
// comporta igual que uno inexistente.
// fecha_evento se devuelve como texto (AAAA-MM-DD) para que pg no lo convierta
// a Date con la zona horaria del servidor.

const COLUMNAS = `
  e.id_evento, e.nombre, e.nombre_homenajeado, e.fecha_evento::text AS fecha_evento,
  e.hora_inicio, e.hora_fin, e.cant_invitados_estimada, e.estado, e.monto_total,
  e.observaciones, e.fecha_creacion, t.nombre AS tipo_evento,
  json_build_object(
    'id_cliente', c.id_cliente, 'nombre', c.nombre, 'apellido', c.apellido,
    'email', c.email, 'telefono', c.telefono
  ) AS cliente`;

const JOINS = `
  FROM eventos e
  JOIN clientes c     ON c.id_empresa = e.id_empresa AND c.id_cliente = e.id_cliente
  JOIN tipos_evento t ON t.id_empresa = e.id_empresa AND t.id_tipo_evento = e.id_tipo_evento`;

// estado: filtra por estado, o null para todos.
export const listar = async (idEmpresa, estado) => {
  exigirEmpresa(idEmpresa);
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS} ${JOINS}
      WHERE e.id_empresa = $1 AND ($2::text IS NULL OR e.estado = $2)
      ORDER BY e.fecha_creacion DESC`,
    [idEmpresa, estado]
  );
  return rows;
};

// Detalle con espacios, servicios y pagos del evento.
export const buscarPorId = async (idEmpresa, id) => {
  exigirEmpresa(idEmpresa);
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS},
       (SELECT COALESCE(json_agg(json_build_object(
                 'id_espacio', es.id_espacio, 'nombre', es.nombre, 'capacidad', es.capacidad)
               ORDER BY es.nombre), '[]')
          FROM eventos_espacios ee
          JOIN espacios es ON es.id_empresa = ee.id_empresa AND es.id_espacio = ee.id_espacio
         WHERE ee.id_empresa = e.id_empresa AND ee.id_evento = e.id_evento) AS espacios,
       (SELECT COALESCE(json_agg(json_build_object(
                 'id_servicio', s.id_servicio, 'nombre', s.nombre,
                 'cantidad', vs.cantidad, 'precio_unitario', vs.precio_unitario::text)
               ORDER BY s.nombre), '[]')
          FROM eventos_servicios vs
          JOIN servicios s ON s.id_empresa = vs.id_empresa AND s.id_servicio = vs.id_servicio
         WHERE vs.id_empresa = e.id_empresa AND vs.id_evento = e.id_evento) AS servicios,
       (SELECT COALESCE(json_agg(json_build_object(
                 'id_pago', p.id_pago, 'monto', p.monto::text, 'fecha_pago', p.fecha_pago,
                 'metodo_pago', p.metodo_pago, 'concepto', p.concepto, 'estado', p.estado)
               ORDER BY p.fecha_pago), '[]')
          FROM pagos p
         WHERE p.id_empresa = e.id_empresa AND p.id_evento = e.id_evento) AS pagos
     ${JOINS}
      WHERE e.id_empresa = $1 AND e.id_evento = $2`,
    [idEmpresa, id]
  );
  return rows[0] ?? null;
};

// ---------- Dentro de la transacción del servicio ----------

// FOR UPDATE: si dos usuarios deciden la misma solicitud a la vez, el segundo
// espera y luego ve el estado ya cambiado (no se registran dos señas).
export const bloquear = async (client, idEmpresa, id) => {
  exigirEmpresa(idEmpresa);
  const { rows } = await client.query(
    `SELECT id_evento, estado, monto_total, fecha_evento::text AS fecha_evento,
            hora_inicio::text AS hora_inicio, hora_fin::text AS hora_fin
       FROM eventos
      WHERE id_empresa = $1 AND id_evento = $2
      FOR UPDATE`,
    [idEmpresa, id]
  );
  return rows[0] ?? null;
};

export const idsEspacios = async (client, idEmpresa, idEvento) => {
  exigirEmpresa(idEmpresa);
  const { rows } = await client.query(
    "SELECT id_espacio FROM eventos_espacios WHERE id_empresa = $1 AND id_evento = $2",
    [idEmpresa, idEvento]
  );
  return rows.map((r) => r.id_espacio);
};

// Serializa las reservas que comparten espacios: si dos admins aceptan a la vez
// solicitudes superpuestas, la segunda espera y luego ve la primera como
// conflicto. El ORDER BY evita deadlocks (todos bloquean en el mismo orden).
export const bloquearEspacios = async (client, idEmpresa, idsEspacio) => {
  exigirEmpresa(idEmpresa);
  await client.query(
    `SELECT id_espacio FROM espacios
      WHERE id_empresa = $1 AND id_espacio = ANY($2::int[])
      ORDER BY id_espacio
      FOR UPDATE`,
    [idEmpresa, idsEspacio]
  );
};

// Rango horario real del evento. Si hora_fin <= hora_inicio el evento cruza la
// medianoche (22:00 a 02:00) y termina al día siguiente. Rangos [inicio, fin):
// un evento que termina 20:00 no choca con otro que empieza 20:00.
const rango = (fecha, inicio, fin) =>
  `tsrange(${fecha} + ${inicio},
           ${fecha} + ${fin} + CASE WHEN ${fin} <= ${inicio} THEN interval '1 day' ELSE interval '0' END)`;

/**
 * Eventos RESERVADOS que ocupan alguno de esos espacios en un horario que se
 * superpone. Mira también el día anterior y el siguiente por los eventos que
 * cruzan la medianoche. excluirEvento evita que un evento choque consigo mismo.
 */
export const conflictosDeEspacio = async (
  client,
  idEmpresa,
  { fecha, horaInicio, horaFin, idsEspacio, excluirEvento = null }
) => {
  exigirEmpresa(idEmpresa);
  const { rows } = await client.query(
    `SELECT e.id_evento, e.nombre, e.fecha_evento::text AS fecha_evento,
            to_char(e.hora_inicio, 'HH24:MI') AS hora_inicio, to_char(e.hora_fin, 'HH24:MI') AS hora_fin,
            array_agg(es.nombre ORDER BY es.nombre) AS espacios
       FROM eventos e
       JOIN eventos_espacios ee ON ee.id_empresa = e.id_empresa AND ee.id_evento = e.id_evento
       JOIN espacios es         ON es.id_empresa = ee.id_empresa AND es.id_espacio = ee.id_espacio
      WHERE e.id_empresa = $1
        AND e.estado = 'reservado'
        AND ($6::int IS NULL OR e.id_evento <> $6)
        AND ee.id_espacio = ANY($5::int[])
        AND e.fecha_evento BETWEEN $2::date - 1 AND $2::date + 1
        AND ${rango("e.fecha_evento", "e.hora_inicio", "e.hora_fin")}
         && ${rango("$2::date", "$3::time", "$4::time")}
      GROUP BY e.id_evento
      ORDER BY e.fecha_evento, e.hora_inicio`,
    [idEmpresa, fecha, horaInicio, horaFin, idsEspacio, excluirEvento]
  );
  return rows;
};

// nota (opcional) se agrega al final de observaciones.
export const cambiarEstado = async (client, idEmpresa, id, estado, nota = null) => {
  exigirEmpresa(idEmpresa);
  await client.query(
    `UPDATE eventos
        SET estado = $3,
            observaciones = CASE WHEN $4::text IS NULL THEN observaciones
                                 ELSE concat_ws(E'\\n', observaciones, $4::text) END
      WHERE id_empresa = $1 AND id_evento = $2`,
    [idEmpresa, id, estado, nota]
  );
};

export const registrarPago = async (client, idEmpresa, p) => {
  exigirEmpresa(idEmpresa);
  const { rows } = await client.query(
    `INSERT INTO pagos (id_empresa, id_evento, id_usuario, monto, metodo_pago, concepto, estado)
     VALUES ($1, $2, $3, $4::numeric, $5, $6, $7)
     RETURNING id_pago, monto, fecha_pago, metodo_pago, concepto, estado`,
    [idEmpresa, p.idEvento, p.idUsuario, p.monto, p.metodoPago, p.concepto, p.estado]
  );
  return rows[0];
};
