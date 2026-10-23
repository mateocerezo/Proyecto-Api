// Devuelve el usuario logueado y su empresa (el frontend lo llama después del
// login de Clerk para saber qué panel mostrar).
export const perfil = (req, res) => {
  res.json(req.usuario);
};
