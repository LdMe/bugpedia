/**
 * Un error que sabe con qué código HTTP responder.
 *
 * @example
 * throw new HttpError(404, "Ese bug no existe");        // en un controlador
 * return next(new HttpError(401, "No hay token"));      // en un middleware
 *
 * Se lanza desde controladores (throw) o middlewares (next(error))
 * y lo convierte en respuesta el errorHandler.
 */
export class HttpError extends Error {
  status: number;

  /**
   * @param status - Código HTTP de la respuesta (400, 401, 403, 404...)
   * @param message - Mensaje para el cliente
   */
  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}
