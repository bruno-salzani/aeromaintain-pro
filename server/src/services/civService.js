export function classifyCiv(naturezaVoo, aeronautas) {
  const funcs = (aeronautas || []).map(a => a.funcao);
  const hasV2 = funcs.includes('9');
  const hasP1 = funcs.includes('1');
  const hasI1 = funcs.includes('3');
  const hasV1 = funcs.includes('8');
  if ((hasP1 && hasV2) || (hasI1 && hasV2)) {
    return { code: 'CIV_RECLASSIFY_SOLO', notes: 'Combinação P1/I1 com V2 detectada para reclassificação pela CIV' };
  }
  if ((naturezaVoo === '8') && (hasV1 && (hasI1 || hasV2))) {
    return { code: 'CIV_TREINAMENTO_INSTRUTOR_ALUNO', notes: 'Treinamento com Instrutor e Aluno' };
  }
  return null;
}
