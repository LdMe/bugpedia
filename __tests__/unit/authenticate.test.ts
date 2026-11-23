import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { createAuthenticate } from '../../src/middlewares/authenticate.ts';
import { HttpError } from '../../src/utils/HttpError.ts';
import { mockReq, mockRes, mockNext, nextError } from '../helpers/express.js';
import { ANA_ID } from '../helpers/users.js';

const SECRET = 'secreto-de-test';
const authenticate = createAuthenticate(SECRET);

const validPayload = { sub: ANA_ID, role: 'user', username: 'ana' };
const sign = (payload: object, secret = SECRET, options: jwt.SignOptions = {}) =>
  jwt.sign(payload, secret, { expiresIn: '1h', ...options });

/** Ejecuta el middleware con la cabecera dada y devuelve req y next. */
function run(authorization?: string) {
  const req = mockReq(authorization === undefined ? {} : { headers: { authorization } });
  const next = mockNext();
  authenticate(req, mockRes(), next);
  return { req, next };
}

function expectHttpError(next: ReturnType<typeof mockNext>, status: number, code: string) {
  const err = nextError(next);
  expect(err).toBeInstanceOf(HttpError);
  expect(err).toMatchObject({ status, code });
}

describe('authenticate', () => {
  describe('sin token', () => {
    it('sin cabecera Authorization → 401 TOKEN_REQUIRED', () => {
      const { next } = run();
      expectHttpError(next, 401, 'TOKEN_REQUIRED');
    });

    it('cabecera sin el prefijo "Bearer " → 401 TOKEN_REQUIRED', () => {
      const { next } = run(sign(validPayload));
      expectHttpError(next, 401, 'TOKEN_REQUIRED');
    });

    it('esquema distinto (Basic) → 401 TOKEN_REQUIRED', () => {
      const { next } = run('Basic YW5hOnN1cGVyc2VjcmV0YQ==');
      expectHttpError(next, 401, 'TOKEN_REQUIRED');
    });
  });

  describe('token no válido → 401 INVALID_TOKEN', () => {
    it('firmado con otro secreto, y no rellena req.user', () => {
      const { req, next } = run(`Bearer ${sign(validPayload, 'otro-secreto')}`);
      expectHttpError(next, 401, 'INVALID_TOKEN');
      expect(req.user).toBeUndefined();
    });

    it('caducado', () => {
      const expired = jwt.sign({ ...validPayload, exp: Math.floor(Date.now() / 1000) - 60 }, SECRET);
      const { next } = run(`Bearer ${expired}`);
      expectHttpError(next, 401, 'INVALID_TOKEN');
    });

    it('texto que no es un JWT', () => {
      const { next } = run('Bearer esto-no-es-un-token');
      expectHttpError(next, 401, 'INVALID_TOKEN');
    });

    it.each([
      ['sin role', { sub: ANA_ID, username: 'ana' }],
      ['con un rol inexistente', { ...validPayload, role: 'superadmin' }],
      ['sin username', { sub: ANA_ID, role: 'user' }],
      ['sin sub', { role: 'user', username: 'ana' }],
    ])('payload %s', (_case, payload) => {
      const { req, next } = run(`Bearer ${sign(payload)}`);
      expectHttpError(next, 401, 'INVALID_TOKEN');
      expect(req.user).toBeUndefined();
    });
  });

  it('token válido → rellena req.user y llama a next() sin argumentos', () => {
    const { req, next } = run(`Bearer ${sign(validPayload)}`);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({ id: ANA_ID, role: 'user', username: 'ana' });
  });

  it('nunca responde directamente: delega siempre en el errorHandler', () => {
    const res = mockRes();
    authenticate(mockReq(), res, mockNext());
    authenticate(mockReq({ headers: { authorization: 'Bearer basura' } }), res, mockNext());

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
