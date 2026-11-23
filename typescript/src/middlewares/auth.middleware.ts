import type { Request, RequestHandler } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { env } from "../config/env.ts";
import type { AuthUser } from "../types/express.d.ts";
import { HttpError } from "../utils/HttpError.ts";

// Lo que hay dentro del token: lo estándar de JWT (exp, iat...) + nuestros datos
interface TokenPayload extends JwtPayload, AuthUser {}

/**
 * Busca el token en la petición. Se admiten dos formas:
 * 1. Cabecera "Authorization: Bearer <token>" (Postman, apps que guardan el token)
 * 2. Cookie "token" (la pone el login; el navegador la envía sola)
 *
 * Si vienen las dos, manda la cabecera: es la que se ha puesto a propósito en esa petición.
 *
 * @param req - La petición
 * @returns El token, o undefined si no hay
 */
const getToken = (req: Request): string | undefined => {
  const authorization = req.headers.authorization;
  if (authorization?.startsWith("Bearer ")) {
    return authorization.split(" ")[1];
  }
  return req.cookies?.token;
};

/**
 * Comprueba el token (de la cabecera o de la cookie) y guarda el usuario en req.user.
 *
 * Si falta o no es válido, pasa un HttpError 401 al errorHandler con next(error).
 *
 * @param req - Lee el token con getToken y rellena req.user
 * @param res - No lo usa: nunca responde directamente
 * @param next - next() si el token es válido; next(error) si no
 */
const isAuthenticated: RequestHandler = (req, res, next) => {
  const token = getToken(req);
  if (!token) {
    return next(new HttpError(401, "No hay token de autenticación"));
  }

  try {
    // verify LANZA un error si el token es falso o ha caducado
    const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    req.user = {
      _id: payload._id,
      role: payload.role,
      username: payload.username,
    };
    next();
  } catch {
    next(new HttpError(401, "Token no válido o caducado"));
  }
};

/**
 * Solo deja pasar a los admin. Va siempre DESPUÉS de isAuthenticated.
 *
 * @param req - Lee req.user.role
 * @param res - No lo usa: nunca responde directamente
 * @param next - next() si es admin; next(HttpError 401) si no hay usuario; next(HttpError 403) si no es admin
 */
const isAdmin: RequestHandler = (req, res, next) => {
  if (!req.user) {
    return next(new HttpError(401, "No hay token de autenticación"));
  }
  if (req.user.role !== "admin") {
    return next(new HttpError(403, "No tienes permiso"));
  }
  next();
};

export { isAuthenticated, isAdmin };
