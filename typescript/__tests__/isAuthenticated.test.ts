import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";
import { isAuthenticated } from "../src/middlewares/auth.middleware.ts";
import { env } from "../src/config/env.ts";
import { HttpError } from "../src/utils/HttpError.ts";
import { ana, bea, mockReq, mockRes, mockNext } from "./helpers.ts";

// El secreto de los tests viene de vitest.config.ts
const sign = (payload: object, secret = env.JWT_SECRET) => jwt.sign(payload, secret);

/** Ejecuta el middleware con una petición falsa y devuelve req y next */
function run(data: Parameters<typeof mockReq>[0] = {}) {
  const req = mockReq(data);
  const next = mockNext();
  isAuthenticated(req, mockRes(), next);
  return { req, next };
}

describe("isAuthenticated con la cabecera Authorization", () => {
  it("sin cabecera ni cookie → 401", () => {
    const { next } = run();
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(HttpError);
    expect(error.status).toBe(401);
  });

  it('cabecera sin "Bearer " → 401', () => {
    const { next } = run({ headers: { authorization: sign(ana) } });
    expect(next.mock.calls[0][0].status).toBe(401);
  });

  it("token firmado con otro secreto → 401 y no rellena req.user", () => {
    const { req, next } = run({ headers: { authorization: `Bearer ${sign(ana, "otro-secreto")}` } });
    expect(next.mock.calls[0][0].status).toBe(401);
    expect(req.user).toBeUndefined();
  });

  it("token caducado → 401", () => {
    const expired = sign({ ...ana, exp: Math.floor(Date.now() / 1000) - 60 });
    const { next } = run({ headers: { authorization: `Bearer ${expired}` } });
    expect(next.mock.calls[0][0].status).toBe(401);
  });

  it("texto que no es un token → 401", () => {
    const { next } = run({ headers: { authorization: "Bearer esto-no-es-un-token" } });
    expect(next.mock.calls[0][0].status).toBe(401);
  });

  it("token válido → guarda el usuario en req.user y llama a next() sin error", () => {
    const { req, next } = run({ headers: { authorization: `Bearer ${sign(ana)}` } });
    expect(req.user).toEqual(ana);
    expect(next).toHaveBeenCalledWith(); // sin argumentos = todo bien
  });
});

describe("isAuthenticated con la cookie", () => {
  it("token válido en la cookie → guarda el usuario en req.user", () => {
    const { req, next } = run({ cookies: { token: sign(ana) } });
    expect(req.user).toEqual(ana);
    expect(next).toHaveBeenCalledWith();
  });

  it("token falso en la cookie → 401", () => {
    const { next } = run({ cookies: { token: sign(ana, "otro-secreto") } });
    expect(next.mock.calls[0][0].status).toBe(401);
  });

  it("si llegan los dos, manda la cabecera", () => {
    const { req } = run({
      headers: { authorization: `Bearer ${sign(ana)}` },
      cookies: { token: sign(bea) },
    });
    expect(req.user).toEqual(ana);
  });
});
