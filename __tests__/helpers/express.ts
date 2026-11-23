import { vi, expect } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import type { AuthUser } from '../../src/types/express.d.ts';

/** Crea un `req` falso con solo lo que necesitan los middlewares. */
export function mockReq(overrides: { headers?: Record<string, string>; user?: AuthUser } = {}): Request {
  return { headers: {}, ...overrides } as unknown as Request;
}

/** `res` falso: `status` devuelve el propio `res` para poder encadenar `.json()`. */
export function mockRes() {
  const res = {} as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

export function mockNext() {
  return vi.fn() as unknown as NextFunction & ReturnType<typeof vi.fn>;
}

/** Devuelve el primer argumento con el que se llamó a `next` (el error, si lo hay). */
export function nextError(next: ReturnType<typeof vi.fn>) {
  expect(next).toHaveBeenCalledTimes(1);
  return next.mock.calls[0][0];
}
