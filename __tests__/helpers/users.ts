import type { AuthUser } from '../../src/types/express.d.ts';

export const ANA_ID = '6749c0aaaaaaaaaaaaaaaaaa';
export const BEA_ID = '6749c1bbbbbbbbbbbbbbbbbb';
export const PROFE_ID = '6749c2cccccccccccccccccc';

export const ana: AuthUser = { id: ANA_ID, role: 'user', username: 'ana' };
export const bea: AuthUser = { id: BEA_ID, role: 'user', username: 'bea' };
export const profe: AuthUser = { id: PROFE_ID, role: 'admin', username: 'profe' };
