// Error "esperado" de la aplicación: lleva el status HTTP y un mensaje
// apto para el cliente. Todo lo que NO sea AppError se trata como 500.
// codigo (opcional) es un identificador estable para que el frontend decida
// qué hacer sin depender del texto del mensaje.
export class AppError extends Error {
  constructor(status, mensaje, detalles, codigo) {
    super(mensaje);
    this.name = "AppError";
    this.status = status;
    this.detalles = detalles;
    this.codigo = codigo;
  }

  static badRequest(mensaje, detalles) {
    return new AppError(400, mensaje, detalles);
  }

  static unauthorized(mensaje = "No autenticado") {
    return new AppError(401, mensaje);
  }

  static forbidden(mensaje = "No tiene permisos para realizar esta acción") {
    return new AppError(403, mensaje);
  }

  static notFound(mensaje = "Recurso no encontrado") {
    return new AppError(404, mensaje);
  }

  static conflict(mensaje) {
    return new AppError(409, mensaje);
  }
}
