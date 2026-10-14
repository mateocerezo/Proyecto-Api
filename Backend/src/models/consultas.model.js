// Consultas del alta de una consulta pública. Todas reciben el client de la
// transacción abierta por el servicio y filtran por id_empresa.
import { exigirEmpresa } from "../utils/sql.js";

export const empresaActiva = async (client, idEmpresa) => {
  exigirEmpresa(idEmpresa);
  const { rows } = await client.query(
    "SELECT 1 FROM empresas WHERE id_empresa = $1 AND activa",
    [idEmpresa]
  );
  return rows.length > 0;
};

export const tipoEventoPorNombre = async (client, idEmpresa, nombre) => {
  exigirEmpresa(idEmpresa);
  const { rows } = await client.query(
    `SELECT id_tipo_evento, nombre, precio_base FROM tipos_evento
      WHERE id_empresa = $1 AND LOWER(nombre) = LOWER($2)`,
    [idEmpresa, nombre]
  );
  return rows[0] ?? null;
};

export const espaciosPorNombre = async (client, idEmpresa, nombres) => {
  exigirEmpresa(idEmpresa);
  const { rows } = await client.query(
    `SELECT id_espacio, nombre, capacidad, precio_adicional FROM espacios
      WHERE id_empresa = $1 AND LOWER(nombre) = ANY($2::text[])`,
    [idEmpresa, nombres.map((n) => n.toLowerCase())]
  );
  return rows;
};

export const serviciosPorNombre = async (client, idEmpresa, nombres) => {
  exigirEmpresa(idEmpresa);
  const { rows } = await client.query(
    `SELECT id_servicio, nombre, precio FROM servicios
      WHERE id_empresa = $1 AND LOWER(nombre) = ANY($2::text[])`,
    [idEmpresa, nombres.map((n) => n.toLowerCase())]
  );
  return rows;
};

// Usuario al que se asigna la consulta (eventos.id_usuario es obligatorio):
// el admin activo más antiguo; si no hay admin, cualquier usuario activo.
export const usuarioResponsable = async (client, idEmpresa) => {
  exigirEmpresa(idEmpresa);
  const { rows } = await client.query(
    `SELECT u.id_usuario
       FROM usuarios u
       JOIN roles r ON r.id_empresa = u.id_empresa AND r.id_rol = u.id_rol
      WHERE u.id_empresa = $1 AND u.activo
      ORDER BY (LOWER(r.nombre) = 'admin') DESC, u.id_usuario
      LIMIT 1`,
    [idEmpresa]
  );
  return rows[0]?.id_usuario ?? null;
};

export const buscarClientePorEmail = async (client, idEmpresa, email) => {
  exigirEmpresa(idEmpresa);
  const { rows } = await client.query(
    `SELECT id_cliente FROM clientes
      WHERE id_empresa = $1 AND LOWER(email) = $2
      ORDER BY id_cliente LIMIT 1`,
    [idEmpresa, email]
  );
  return rows[0]?.id_cliente ?? null;
};

// dni queda NULL: el formulario público no lo pide (ver migración 002).
export const crearCliente = async (client, idEmpresa, { nombre, apellido, email, telefono }) => {
  exigirEmpresa(idEmpresa);
  const { rows } = await client.query(
    `INSERT INTO clientes (id_empresa, nombre, apellido, telefono, email)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id_cliente`,
    [idEmpresa, nombre, apellido, telefono, email]
  );
  return rows[0].id_cliente;
};

export const crearEvento = async (client, idEmpresa, e) => {
  exigirEmpresa(idEmpresa);
  const { rows } = await client.query(
    `INSERT INTO eventos
       (id_empresa, id_cliente, id_tipo_evento, id_usuario, nombre, nombre_homenajeado,
        fecha_evento, hora_inicio, hora_fin, cant_invitados_estimada, estado, monto_total, observaciones)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'consultado', $11::numeric, $12)
     RETURNING id_evento, estado, monto_total`,
    [
      idEmpresa, e.idCliente, e.idTipoEvento, e.idUsuario, e.nombre, e.homenajeado,
      e.fecha, e.horaInicio, e.horaFin, e.invitados, e.montoTotal, e.observaciones
    ]
  );
  return rows[0];
};

export const vincularEspacios = async (client, idEmpresa, idEvento, idsEspacio) => {
  exigirEmpresa(idEmpresa);
  await client.query(
    `INSERT INTO eventos_espacios (id_empresa, id_evento, id_espacio)
     SELECT $1, $2, UNNEST($3::int[])`,
    [idEmpresa, idEvento, idsEspacio]
  );
};

export const vincularServicios = async (client, idEmpresa, idEvento, servicios) => {
  exigirEmpresa(idEmpresa);
  if (servicios.length === 0) return;
  await client.query(
    `INSERT INTO eventos_servicios (id_empresa, id_evento, id_servicio, cantidad, precio_unitario)
     SELECT $1, $2, s.id_servicio, s.cantidad, s.precio_unitario::numeric
       FROM UNNEST($3::int[], $4::int[], $5::text[]) AS s(id_servicio, cantidad, precio_unitario)`,
    [
      idEmpresa,
      idEvento,
      servicios.map((s) => s.idServicio),
      servicios.map((s) => s.cantidad),
      servicios.map((s) => s.precioUnitario)
    ]
  );
};
