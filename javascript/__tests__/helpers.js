import { vi } from "vitest";

// Usuarios de prueba (los ids tienen el formato de un ObjectId: 24 caracteres hexadecimales)
export const ana = { _id: "6749c0aaaaaaaaaaaaaaaaaa", role: "user", username: "ana" };
export const bea = { _id: "6749c1bbbbbbbbbbbbbbbbbb", role: "user", username: "bea" };
export const profe = { _id: "6749c2cccccccccccccccccc", role: "admin", username: "profe" };

/** Un req falso con solo lo que usan los middlewares */
export function mockReq(data = {}) {
  return { headers: {}, cookies: {}, ...data };
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
  return res;
}

/** Un next falso: vi.fn() recuerda con qué argumentos se le llamó */
export function mockNext() {
  return vi.fn();
}
