import { describe, it, expect } from 'vitest';
import { sortSolutions } from '../../src/utils/sortSolutions.ts';

/** Crea una solución mínima: solo los campos que importan para ordenar. */
const solution = (text: string, { verified = false, votes = 0, createdAt = '2026-11-23T10:00:00Z' } = {}) => ({
  text,
  verified,
  votes: Array.from({ length: votes }, (_, i) => `user-${i}`),
  createdAt: new Date(createdAt),
});

const texts = (list: { text: string }[]) => list.map((s) => s.text);

describe('sortSolutions', () => {
  it('pone primero las verificadas, aunque tengan menos votos', () => {
    const result = sortSolutions([
      solution('popular', { votes: 10 }),
      solution('verificada', { verified: true, votes: 0 }),
    ]);
    expect(texts(result)).toEqual(['verificada', 'popular']);
  });

  it('entre no verificadas, más votos primero', () => {
    const result = sortSolutions([
      solution('uno', { votes: 1 }),
      solution('cinco', { votes: 5 }),
      solution('tres', { votes: 3 }),
    ]);
    expect(texts(result)).toEqual(['cinco', 'tres', 'uno']);
  });

  it('entre verificadas, también más votos primero', () => {
    const result = sortSolutions([
      solution('v1', { verified: true, votes: 1 }),
      solution('v4', { verified: true, votes: 4 }),
    ]);
    expect(texts(result)).toEqual(['v4', 'v1']);
  });

  it('a igualdad de verificación y votos, la más antigua primero', () => {
    const result = sortSolutions([
      solution('nueva', { votes: 2, createdAt: '2026-11-23T12:00:00Z' }),
      solution('antigua', { votes: 2, createdAt: '2026-11-23T09:00:00Z' }),
    ]);
    expect(texts(result)).toEqual(['antigua', 'nueva']);
  });

  it('aplica los tres criterios a la vez', () => {
    const result = sortSolutions([
      solution('sin votos', { createdAt: '2026-11-20T00:00:00Z' }),
      solution('verificada nueva', { verified: true, votes: 1, createdAt: '2026-11-23T00:00:00Z' }),
      solution('3 votos', { votes: 3 }),
      solution('verificada antigua', { verified: true, votes: 1, createdAt: '2026-11-21T00:00:00Z' }),
    ]);
    expect(texts(result)).toEqual(['verificada antigua', 'verificada nueva', '3 votos', 'sin votos']);
  });

  it('con un array vacío devuelve un array vacío', () => {
    expect(sortSolutions([])).toEqual([]);
  });

  it('no modifica el array original: devuelve uno nuevo', () => {
    const original = [solution('a', { votes: 0 }), solution('b', { votes: 9 })];
    const copy = [...original];

    const result = sortSolutions(original);

    expect(result).not.toBe(original);
    expect(original).toEqual(copy);
  });
});
