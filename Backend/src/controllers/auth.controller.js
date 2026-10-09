import * as authService from "../services/auth.service.js";

export const login = async (req, res) => {
  const resultado = await authService.login(req.datos.body);
  res.json(resultado);
};

// Devuelve el usuario logueado (útil para que el frontend restaure la sesión).
export const perfil = (req, res) => {
  res.json(req.usuario);
};
