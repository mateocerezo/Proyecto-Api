import pool from "../data/db.js";
 
export const obtenerEmpresas = async (req, res) => {
  try {
    const resultado = await pool.query("SELECT * FROM empresas ORDER BY id_empresa");
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al obtener las empresas" });
  }
};

export const obtenerEmpresaPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const resultado = await pool.query(
      "SELECT * FROM empresas WHERE id_empresa = $1",
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensaje: "Empresa no encontrada" });
    }

    res.json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al obtener la empresa" });
  }
};

export const crearEmpresa = async (req, res) => {
  try {
    const { nombre, cuit, email, telefono } = req.body ?? {};

    if (!nombre || !cuit || !email) {
      return res
        .status(400)
        .json({ mensaje: "Los campos nombre, cuit y email son obligatorios" });
    }

    const resultado = await pool.query(
      `INSERT INTO empresas (nombre, cuit, email, telefono)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [nombre, cuit, email, telefono]
    );

    res.status(201).json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    if (error.code === "23505") {
      return res
        .status(400)
        .json({ mensaje: "Ya existe una empresa con ese nombre o CUIT" });
    }
    res.status(500).json({ mensaje: "Error al crear la empresa" });
  }
};

export const editarEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, cuit, email, telefono, activa } = req.body ?? {};

    const resultado = await pool.query(
      `UPDATE empresas
       SET nombre = COALESCE($1, nombre),
           cuit = COALESCE($2, cuit),
           email = COALESCE($3, email),
           telefono = COALESCE($4, telefono),
           activa = COALESCE($5, activa)
       WHERE id_empresa = $6
       RETURNING *`,
      [nombre, cuit, email, telefono, activa, id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensaje: "Empresa no encontrada" });
    }

    res.json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    if (error.code === "23505") {
      return res
        .status(400)
        .json({ mensaje: "Ya existe una empresa con ese nombre o CUIT" });
    }
    res.status(500).json({ mensaje: "Error al editar la empresa" });
  }
};

export const eliminarEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const resultado = await pool.query(
      "DELETE FROM empresas WHERE id_empresa = $1",
      [id]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({ mensaje: "Empresa no encontrada" });
    }

    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al eliminar la empresa" });
  }
};
