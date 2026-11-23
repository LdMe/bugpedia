import { describe, it, expect } from 'vitest';
import { buildBugQuery } from '../../src/utils/buildBugQuery.ts';
import { HttpError } from '../../src/utils/HttpError.ts';
import { ANA_ID } from '../helpers/users.js';

/** Comprueba que la query lanza un 400 INVALID_QUERY que menciona el parámetro. */
function expectInvalid(query: Record<string, unknown>, param: string) {
  let error: unknown;
  try {
    buildBugQuery(query);
  } catch (e) {
    error = e;
  }
  expect(error, `debería fallar con ${JSON.stringify(query)}`).toBeInstanceOf(HttpError);
  expect(error).toMatchObject({ status: 400, code: 'INVALID_QUERY' });
  expect((error as HttpError).message).toContain(param);
}

describe('buildBugQuery', () => {
  describe('valores por defecto', () => {
    it('sin query: filtro vacío, orden recent, página 1, límite 10', () => {
      expect(buildBugQuery({})).toEqual({
        filter: {},
        sort: { createdAt: -1 },
        page: 1,
        limit: 10,
        skip: 0,
      });
    });

    it('ignora los parámetros desconocidos', () => {
      expect(buildBugQuery({ color: 'rojo', foo: 'bar' })).toEqual(buildBugQuery({}));
    });
  });

  describe('technology', () => {
    it('una tecnología → $in con un elemento', () => {
      expect(buildBugQuery({ technology: 'react' }).filter).toEqual({ technologies: { $in: ['react'] } });
    });

    it('varias separadas por comas → $in con todas', () => {
      expect(buildBugQuery({ technology: 'react,node' }).filter).toEqual({ technologies: { $in: ['react', 'node'] } });
    });

    it('una tecnología que no existe → error', () => {
      expectInvalid({ technology: 'cobol' }, 'technology');
      expectInvalid({ technology: 'react,cobol' }, 'technology');
    });
  });

  describe('minDanger', () => {
    it('minDanger=4 → $gte 4', () => {
      expect(buildBugQuery({ minDanger: '4' }).filter).toEqual({ dangerLevel: { $gte: 4 } });
    });

    it.each(['0', '6', '2.5', 'alto', '', '-1'])('minDanger=%s → error', (value) => {
      expectInvalid({ minDanger: value }, 'minDanger');
    });
  });

  describe('solved y verified', () => {
    it('solved=true → existe la primera solución', () => {
      expect(buildBugQuery({ solved: 'true' }).filter).toEqual({ 'solutions.0': { $exists: true } });
    });

    it('solved=false → array de soluciones vacío', () => {
      expect(buildBugQuery({ solved: 'false' }).filter).toEqual({ solutions: { $size: 0 } });
    });

    it('verified=true → alguna solución verificada', () => {
      expect(buildBugQuery({ verified: 'true' }).filter).toEqual({ 'solutions.verified': true });
    });

    it('verified=false → ninguna solución verificada', () => {
      expect(buildBugQuery({ verified: 'false' }).filter).toEqual({ 'solutions.verified': { $ne: true } });
    });

    it.each([
      ['solved', 'quizas'],
      ['solved', '1'],
      ['verified', 'si'],
    ])('%s=%s → error', (param, value) => {
      expectInvalid({ [param]: value }, param);
    });
  });

  describe('author', () => {
    it('id válido → filtro por autor', () => {
      const { filter } = buildBugQuery({ author: ANA_ID });
      expect(Object.keys(filter)).toEqual(['author']);
      expect(String(filter.author)).toBe(ANA_ID);
    });

    it('id mal formado → error', () => {
      expectInvalid({ author: 'patata' }, 'author');
    });
  });

  describe('search', () => {
    it('busca en name, errorMessage y description sin distinguir mayúsculas', () => {
      const { filter } = buildBugQuery({ search: 'cors' });
      const or = filter.$or as Record<string, RegExp>[];

      expect(or.map((condition) => Object.keys(condition)[0])).toEqual(['name', 'errorMessage', 'description']);
      for (const condition of or) {
        const regex = Object.values(condition)[0];
        expect(regex).toBeInstanceOf(RegExp);
        expect(regex.flags).toContain('i');
        expect(regex.test('El CORS Salvaje')).toBe(true);
        expect(regex.test('El Puerto Okupa')).toBe(false);
      }
    });

    it('escapa los caracteres especiales: "fetch(" se busca como texto', () => {
      const { filter } = buildBugQuery({ search: 'fetch(' });
      const regex = Object.values((filter.$or as Record<string, RegExp>[])[0])[0];

      expect(regex.test("TypeError: fetch('http://localhost') failed")).toBe(true);
      expect(regex.test('fetch sin paréntesis')).toBe(false);
    });

    it('".map(" no actúa como comodín', () => {
      const { filter } = buildBugQuery({ search: '.map(' });
      const regex = Object.values((filter.$or as Record<string, RegExp>[])[0])[0];

      expect(regex.test('items.map(x => x)')).toBe(true);
      expect(regex.test('Xmap(')).toBe(false);
    });

    it('menos de 2 caracteres o más de 100 → error', () => {
      expectInvalid({ search: 'a' }, 'search');
      expectInvalid({ search: 'x'.repeat(101) }, 'search');
    });

    it('2 y 100 caracteres son válidos (límites)', () => {
      expect(() => buildBugQuery({ search: 'ab' })).not.toThrow();
      expect(() => buildBugQuery({ search: 'x'.repeat(100) })).not.toThrow();
    });
  });

  describe('sort', () => {
    it.each([
      ['recent', { createdAt: -1 }],
      ['sightings', { sightingsCount: -1, createdAt: -1 }],
      ['danger', { dangerLevel: -1, createdAt: -1 }],
    ])('sort=%s', (value, expected) => {
      expect(buildBugQuery({ sort: value }).sort).toEqual(expected);
    });

    it('el desempate por createdAt va después del criterio principal', () => {
      expect(Object.keys(buildBugQuery({ sort: 'danger' }).sort)).toEqual(['dangerLevel', 'createdAt']);
    });

    it('sort=random → error', () => {
      expectInvalid({ sort: 'random' }, 'sort');
    });
  });

  describe('paginación', () => {
    it('page=3&limit=20 → skip 40', () => {
      expect(buildBugQuery({ page: '3', limit: '20' })).toMatchObject({ page: 3, limit: 20, skip: 40 });
    });

    it('limit=50 es el máximo permitido', () => {
      expect(buildBugQuery({ limit: '50' }).limit).toBe(50);
    });

    it.each([
      ['limit', '51'],
      ['limit', '0'],
      ['limit', 'diez'],
      ['page', '0'],
      ['page', '-2'],
      ['page', '1.5'],
    ])('%s=%s → error', (param, value) => {
      expectInvalid({ [param]: value }, param);
    });
  });

  it('un parámetro repetido (llega como array) → error', () => {
    expectInvalid({ sort: ['recent', 'danger'] }, 'sort');
    expectInvalid({ technology: ['react', 'node'] }, 'technology');
  });

  it('no deja pasar objetos (inyección NoSQL vía query string)', () => {
    expectInvalid({ author: { $ne: null } }, 'author');
  });

  it('combina todos los filtros a la vez', () => {
    const result = buildBugQuery({
      technology: 'react,express',
      minDanger: '3',
      solved: 'false',
      verified: 'false',
      author: ANA_ID,
      search: 'cors',
      sort: 'danger',
      page: '2',
      limit: '5',
    });

    expect(result.filter).toMatchObject({
      technologies: { $in: ['react', 'express'] },
      dangerLevel: { $gte: 3 },
      solutions: { $size: 0 },
      'solutions.verified': { $ne: true },
    });
    expect(String(result.filter.author)).toBe(ANA_ID);
    expect(result.filter.$or).toHaveLength(3);
    expect(result.sort).toEqual({ dangerLevel: -1, createdAt: -1 });
    expect(result).toMatchObject({ page: 2, limit: 5, skip: 5 });
  });
});
