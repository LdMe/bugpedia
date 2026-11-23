import { describe, it, expect } from 'vitest';
import { Types } from 'mongoose';
import { isOwner, isOwnerOrAdmin } from '../../src/utils/permissions.ts';
import { ana, bea, profe, ANA_ID, PROFE_ID } from '../helpers/users.js';

// Se prueban juntas para que se vea que son complementarias:
// isOwnerOrAdmin decide quién edita/borra; isOwner decide quién NO puede votar.
describe('isOwner e isOwnerOrAdmin', () => {
  it.each([
    //  caso                               usuario  autor                         isOwner  isOwnerOrAdmin
    ['el autor (id como ObjectId)',        ana,     new Types.ObjectId(ANA_ID),   true,    true],
    ['el autor (id como string)',          ana,     ANA_ID,                       true,    true],
    ['otro user',                          bea,     new Types.ObjectId(ANA_ID),   false,   false],
    ['un admin que no es el autor',        profe,   new Types.ObjectId(ANA_ID),   false,   true],
    ['un admin que sí es el autor',        profe,   new Types.ObjectId(PROFE_ID), true,    true],
  ])('%s', (_case, user, authorId, owner, ownerOrAdmin) => {
    expect(isOwner(user, authorId)).toBe(owner);
    expect(isOwnerOrAdmin(user, authorId)).toBe(ownerOrAdmin);
  });

  it('funciona con el autor de una solución (author.id embebido)', () => {
    const solution = { author: { id: new Types.ObjectId(ANA_ID), username: 'ana' } };
    expect(isOwner(ana, solution.author.id)).toBe(true);
    expect(isOwner(bea, solution.author.id)).toBe(false);
  });

  it('sin autor (null/undefined) nadie es el dueño', () => {
    expect(isOwner(ana, null)).toBe(false);
    expect(isOwner(ana, undefined)).toBe(false);
    expect(isOwnerOrAdmin(ana, undefined)).toBe(false);
    expect(isOwnerOrAdmin(profe, undefined)).toBe(true);
  });
});
