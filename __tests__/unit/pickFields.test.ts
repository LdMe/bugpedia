import { describe, it, expect } from 'vitest';
import { pickFields, findForbiddenFields } from '../../src/utils/pickFields.ts';

const BUG_FIELDS = ['name', 'errorMessage', 'description', 'code', 'technologies', 'dangerLevel'];

describe('pickFields', () => {
  it('devuelve solo los campos permitidos', () => {
    const body = { name: 'El CORS Salvaje', dangerLevel: 4, author: 'otro-id', solutions: [{ verified: true }] };
    expect(pickFields(body, BUG_FIELDS)).toEqual({ name: 'El CORS Salvaje', dangerLevel: 4 });
  });

  it('impide registrarse como admin (role se descarta)', () => {
    const body = { username: 'ana', email: 'ana@ejemplo.com', password: 'supersecreta', role: 'admin' };
    expect(pickFields(body, ['username', 'email', 'password'])).not.toHaveProperty('role');
  });

  it('no añade claves undefined para los campos que no llegan', () => {
    const result = pickFields({ name: 'X' }, BUG_FIELDS);
    expect(Object.keys(result)).toEqual(['name']);
  });

  it('conserva valores "falsy" que sí han llegado', () => {
    expect(pickFields({ verified: false }, ['verified'])).toEqual({ verified: false });
    expect(pickFields({ code: '' }, ['code'])).toEqual({ code: '' });
  });

  it('con un body vacío devuelve un objeto vacío', () => {
    expect(pickFields({}, BUG_FIELDS)).toEqual({});
  });
});

describe('findForbiddenFields', () => {
  it('lista los campos no permitidos (para el 400 NON_EDITABLE_FIELD del PATCH)', () => {
    const body = { dangerLevel: 3, author: 'otro-id', sightings: [] };
    expect(findForbiddenFields(body, BUG_FIELDS)).toEqual(['author', 'sightings']);
  });

  it('devuelve una lista vacía si todo está permitido', () => {
    expect(findForbiddenFields({ name: 'X', dangerLevel: 2 }, BUG_FIELDS)).toEqual([]);
  });
});
