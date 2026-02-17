export async function closeVolumeUC(id, body, deps) {
  const vols = await deps.volumeService.listVolumes();
  const vol = vols.find(v => (v.id || v._id?.toString()) === id);
  if (!vol) throw new Error('Not found');
  if (vol.status !== 'ABERTO') throw new Error('volume já fechado');
  const operatorIdHeader = deps.operatorId;
  const operatorId = typeof operatorIdHeader === 'string' ? operatorIdHeader : (Array.isArray(vol.anacOperatorIds) ? vol.anacOperatorIds[0] : '');
  if (!operatorId) throw new Error('operator id required');
  let anacResponse = null;
  if (vol.anacVolumeId) {
    anacResponse = await deps.anacService.closeVolumePutOnAnac(vol.anacVolumeId, operatorId, body);
  }
  const [dd, mm, yyyy] = body.dataFechamentoVolume.split('/');
  const dateIso = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`).toISOString();
  const updated = await deps.volumeService.closeVolume(id, body.observacoesTermoDeFechamento || 'Encerrado', dateIso);
  return { updated, anacResponse };
}
