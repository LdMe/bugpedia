import { vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import type { AuthUser } from "../src/types/express.d.ts";

// Usuarios de prueba (los ids tienen el formato de un ObjectId: 24 caracteres hexadecimales)
export const ana: AuthUser = { _id: "6749c0aaaaaaaaaaaaaaaaaa", role: "user", username: "ana" };
export const bea: AuthUser = { _id: "6749c1bbbbbbbbbbbbbbbbbb", role: "user", username: "bea" };
export const profe: AuthUser = { _id: "6749c2cccccccccccccccccc", role: "admin", username: "profe" };

/** Un req falso con solo lo que usan los middlewares */
export function mockReq(
  data: { headers?: Record<string, string>; cookies?: Record<string, string>; user?: AuthUser } = {},
): Request {
  return { headers: {}, cookies: {}, ...data } as unknown as Request;
}

/** Un res falso: status() devuelve el propio res para poder encadenar .json() */
export function mockRes() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
    clearCookie: vi.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  res.clearCookie.mockReturnValue(res);
  return res as unknown as Response & typeof res;
}

/** Un next falso: vi.fn() recuerda con qué argumentos se le llamó */
export function mockNext() {
  return vi.fn() as unknown as NextFunction & ReturnType<typeof vi.fn>;
}
