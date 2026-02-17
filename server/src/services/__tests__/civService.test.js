import { describe, it, expect } from 'vitest';
import { classifyCiv } from '../civService.js';

describe('civService.classifyCiv', () => {
  it('CIV_RECLASSIFY_SOLO for P1 + V2', () => {
    const civ = classifyCiv('6', [{ funcao: '1' }, { funcao: '9' }]);
    expect(civ).toBeTruthy();
    expect(civ.code).toBe('CIV_RECLASSIFY_SOLO');
  });
  it('CIV_TREINAMENTO_INSTRUTOR_ALUNO for V1 + I1 in natureza 8', () => {
    const civ = classifyCiv('8', [{ funcao: '8' }, { funcao: '3' }]);
    expect(civ).toBeTruthy();
    expect(civ.code).toBe('CIV_TREINAMENTO_INSTRUTOR_ALUNO');
  });
  it('null for unrelated crew', () => {
    const civ = classifyCiv('6', [{ funcao: '11' }, { funcao: '12' }]);
    expect(civ).toBeNull();
  });
});
