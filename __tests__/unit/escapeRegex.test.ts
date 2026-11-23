import { describe, it, expect } from 'vitest';
import { escapeRegex } from '../../src/utils/escapeRegex.ts';

describe('escapeRegex', () => {
  it('deja igual el texto sin caracteres especiales', () => {
    expect(escapeRegex('cors policy')).toBe('cors policy');
  });

  it.each(['.', '*', '+', '?', '^', '$', '{', '}', '(', ')', '|', '[', ']', '\\'])(
    'escapa el carácter %s',
    (char) => {
      const regex = new RegExp(escapeRegex(char));
      expect(regex.test(char)).toBe(true);
      expect(regex.test('abc')).toBe(false);
    },
  );

  it('el resultado siempre es una expresión válida que coincide con el texto literal', () => {
    const nasty = "fetch('x').then((r) => r.json()) [a-z]+ $1 ^.*?|\\";
    const regex = new RegExp(escapeRegex(nasty));
    expect(regex.test(`antes ${nasty} después`)).toBe(true);
  });

  it('neutraliza patrones de ReDoS como (a+)+', () => {
    const regex = new RegExp(escapeRegex('(a+)+$'));
    expect(regex.test('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!')).toBe(false);
    expect(regex.test('(a+)+$')).toBe(true);
  });
});
