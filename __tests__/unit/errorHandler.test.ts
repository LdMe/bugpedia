import { describe, it, expect, vi, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { errorHandler } from '../../src/middlewares/errorHandler.ts';
import { HttpError } from '../../src/utils/HttpError.ts';
import { mockReq, mockRes, mockNext } from '../helpers/express.js';

/** Pasa el error por el handler y devuelve el status y el body de la respuesta. */
function handle(err: unknown) {
  const res = mockRes();
  errorHandler(err, mockReq(), res, mockNext());
  expect(res.status).toHaveBeenCalledTimes(1);
  expect(res.json).toHaveBeenCalledTimes(1);
  return { status: res.status.mock.calls[0][0], body: res.json.mock.calls[0][0] };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('errorHandler', () => {
  it('HttpError → su status, code y mensaje', () => {
    const { status, body } = handle(new HttpError(403, 'NOT_OWNER', 'Este error no es tuyo'));
    expect(status).toBe(403);
    expect(body).toEqual({ error: { code: 'NOT_OWNER', message: 'Este error no es tuyo' } });
  });

  it('ValidationError de Mongoose → 400 VALIDATION_ERROR con details por campo', () => {
    const Model = mongoose.models.TestBug ?? mongoose.model('TestBug', new mongoose.Schema({
      name: { type: String, required: [true, 'El nombre es obligatorio'] },
      dangerLevel: { type: Number, min: [1, 'La peligrosidad debe estar entre 1 y 5'] },
    }));
    const err = new Model({ dangerLevel: 0 }).validateSync();

    const { status, body } = handle(err);
    expect(status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details).toEqual({
      name: 'El nombre es obligatorio',
      dangerLevel: 'La peligrosidad debe estar entre 1 y 5',
    });
  });

  it('CastError (id mal formado, /bugs/patata) → 400 INVALID_ID', () => {
    const err = new mongoose.Error.CastError('ObjectId', 'patata', '_id');
    const { status, body } = handle(err);
    expect(status).toBe(400);
    expect(body.error.code).toBe('INVALID_ID');
  });

  it('VersionError (modificación simultánea) → 409 CONFLICT', () => {
    const doc = new (mongoose.model('TestVersion', new mongoose.Schema({})))();
    const err = new mongoose.Error.VersionError(doc as unknown as mongoose.Document, 0, []);
    const { status, body } = handle(err);
    expect(status).toBe(409);
    expect(body.error.code).toBe('CONFLICT');
  });

  it('clave duplicada (code 11000) → 409 DUPLICATE_KEY indicando el campo', () => {
    const err = Object.assign(new Error('E11000 duplicate key'), { code: 11000, keyValue: { email: 'ana@ejemplo.com' } });
    const { status, body } = handle(err);
    expect(status).toBe(409);
    expect(body.error.code).toBe('DUPLICATE_KEY');
    expect(body.error.message).toContain('email');
  });

  it('JSON mal formado en el body → 400 INVALID_JSON', () => {
    const err = Object.assign(new SyntaxError('Unexpected token'), { type: 'entity.parse.failed', status: 400 });
    const { status, body } = handle(err);
    expect(status).toBe(400);
    expect(body.error.code).toBe('INVALID_JSON');
  });

  it('cualquier otro error → 500 genérico, sin filtrar el mensaje real al cliente', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('MongoServerError: password=hunter2 en la cadena de conexión');

    const { status, body } = handle(err);

    expect(status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(body)).not.toContain('hunter2');
    expect(body.error).not.toHaveProperty('stack');
    expect(consoleSpy).toHaveBeenCalledWith(err); // el error real sí se ve en el servidor
  });

  it('las respuestas siempre tienen la forma { error: { code, message } }', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    for (const err of [new HttpError(404, 'BUG_NOT_FOUND', 'No existe'), new Error('x'), 'un string lanzado']) {
      const { body } = handle(err);
      expect(body.error).toEqual(expect.objectContaining({ code: expect.any(String), message: expect.any(String) }));
    }
  });
});
