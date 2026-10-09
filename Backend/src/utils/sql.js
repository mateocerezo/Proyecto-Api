// Helpers para construir consultas de forma segura.

/**
 * Garantiza que una consulta de modelo reciba el id de la empresa (tenant).
 * Es una red de seguridad: si algún servicio olvida pasar req.id_empresa,
 * la consulta explota en vez de devolver/modificar datos de otro tenant.
 */
export const exigirEmpresa = (idEmpresa) => {
  if (!Number.isInteger(idEmpresa) || idEmpresa <= 0) {
    throw new Error("Consulta multi-tenant sin id_empresa válido");
  }
};

/**
 * Arma la cláusula SET de un UPDATE parcial.
 * Solo acepta columnas de la lista blanca: los NOMBRES de columna nunca
 * vienen del usuario sin filtrar, y los VALORES siempre van parametrizados.
 *
 * @param {object} cambios      ej: { nombre: "VIP", precio: "1500.00" }
 * @param {string[]} permitidas columnas editables de la tabla
 * @param {number} desde        índice del primer placeholder ($n)
 * @returns {{ set: string, valores: any[] }}
 */
export const armarSet = (cambios, permitidas, desde = 1) => {
  const columnas = Object.keys(cambios).filter((c) => cambios[c] !== undefined);

  for (const columna of columnas) {
    if (!permitidas.includes(columna)) {
      throw new Error(`Columna no permitida en UPDATE: ${columna}`);
    }
  }
  if (columnas.length === 0) {
    throw new Error("UPDATE sin columnas para modificar");
  }

  return {
    set: columnas.map((c, i) => `${c} = $${desde + i}`).join(", "),
    valores: columnas.map((c) => cambios[c])
  };
};
