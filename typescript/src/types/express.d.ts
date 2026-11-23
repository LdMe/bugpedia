// Archivo de declaración (.d.ts): solo contiene tipos, nunca se ejecuta.
// Sirve para "ampliar" tipos que vienen de una librería, en este caso el Request de Express.
import type { Role } from "../config/constants.ts";

/** El usuario que viaja en el token y que isAuthenticated guarda en req.user */
export interface AuthUser {
  _id: string;
  role: Role;
  username: string;
}

declare global {
  namespace Express {
    interface Request {
      // Opcional (?): solo existe en las rutas que pasan por isAuthenticated
      user?: AuthUser;
    }
  }
}
