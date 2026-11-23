import { describe, it, expect } from 'vitest';
import { requireRole } from '../../src/middlewares/requireRole.ts';
import { HttpError } from '../../src/utils/HttpError.ts';
import { mockReq, mockRes, mockNext, nextError } from '../helpers/express.js';
import { ana, profe } from '../helpers/users.js';

describe('requireRole', () => {
  it('sin req.user → 401 TOKEN_REQUIRED', () => {
    const next = mockNext();
    requireRole('admin')(mockReq(), mockRes(), next);

    const err = nextError(next);
    expect(err).toBeInstanceOf(HttpError);
    expect(err).toMatchObject({ status: 401, code: 'TOKEN_REQUIRED' });
  });

  it('un user en una ruta de admin → 403 FORBIDDEN', () => {
    const next = mockNext();
    requireRole('admin')(mockReq({ user: ana }), mockRes(), next);

    const err = nextError(next);
    expect(err).toBeInstanceOf(HttpError);
    expect(err).toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });

  it('un admin en una ruta de admin → next() sin argumentos', () => {
    const next = mockNext();
    requireRole('admin')(mockReq({ user: profe }), mockRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('con varios roles permitidos deja pasar a cualquiera de ellos', () => {
    const middleware = requireRole('user', 'admin');

    for (const user of [ana, profe]) {
      const next = mockNext();
      middleware(mockReq({ user }), mockRes(), next);
      expect(next).toHaveBeenCalledWith();
    }
  });

  it('nunca responde directamente: delega siempre en el errorHandler', () => {
    const res = mockRes();
    const middleware = requireRole('admin');

    middleware(mockReq(), res, mockNext());
    middleware(mockReq({ user: ana }), res, mockNext());
    middleware(mockReq({ user: profe }), res, mockNext());

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
