import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import { traducirErrorPg } from "../utils/pgErrores.js";
import * as usuariosModel from "../models/usuarios.model.js";
import * as rolesModel from "../models/roles.model.js";

const ROUNDS_BCRYPT = 10;

// Hash "señuelo": si el email no existe igual se ejecuta un bcrypt.compare,
// así la respuesta tarda lo mismo y no se puede adivinar qué emails existen.
const HASH_SENUELO = bcrypt.hashSync("password-inexistente", ROUNDS_BCRYPT);

const CREDENCIALES_INVALIDAS = "Email o contraseña incorrectos";

export const login = async ({ email, password, id_empresa }) => {
  const candidatos = await usuariosModel.buscarParaLogin(email, id_empresa ?? null);

  if (candidatos.length === 0) {
    await bcrypt.compare(password, HASH_SENUELO);
    throw AppError.unauthorized(CREDENCIALES_INVALIDAS);
  }

  // El email es único por empresa: nos quedamos con los usuarios cuya
  // contraseña coincide. Si son varios, el cliente debe indicar la empresa.
  const coincidentes = [];
  for (const candidato of candidatos) {
    if (await bcrypt.compare(password, candidato.contrasena_hash)) {
      coincidentes.push(candidato);
    }
  }

  if (coincidentes.length === 0) {
    throw AppError.unauthorized(CREDENCIALES_INVALIDAS);
  }
  if (coincidentes.length > 1) {
    throw AppError.conflict("El usuario pertenece a varias empresas; indique id_empresa");
  }

  const usuario = coincidentes[0];
  if (!usuario.activo) {
    throw AppError.unauthorized("El usuario está deshabilitado");
  }
  if (!usuario.empresa_activa) {
    throw AppError.forbidden("La empresa se encuentra deshabilitada");
  }

  const token = jwt.sign(
    { id_empresa: usuario.id_empresa, rol: usuario.rol },
    env.jwtSecret,
    { subject: String(usuario.id_usuario), expiresIn: env.jwtExpiresIn, algorithm: "HS256" }
  );

  return {
    token,
    usuario: {
      id_usuario: usuario.id_usuario,
      id_empresa: usuario.id_empresa,
      empresa: usuario.empresa,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      rol: usuario.rol
    }
  };
};

// Usado por el script de alta de usuarios (no se expone por HTTP en esta etapa).
export const registrarUsuario = async ({ idEmpresa, nombreRol, nombre, apellido, email, password }) => {
  const contrasenaHash = await bcrypt.hash(password, ROUNDS_BCRYPT);
  try {
    const rol = await rolesModel.obtenerOCrear(idEmpresa, nombreRol);
    return await usuariosModel.crear({ idEmpresa, idRol: rol.id_rol, nombre, apellido, email, contrasenaHash });
  } catch (error) {
    throw traducirErrorPg(error, {
      duplicado: "Ya existe un usuario con ese email en la empresa",
      enUso: "La empresa indicada no existe"
    });
  }
};
