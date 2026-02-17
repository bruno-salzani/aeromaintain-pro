export async function updateVolumeUC(id, body, deps) {
  const vols = await deps.volumeService.listVolumes();
  const vol = vols.find(v => (v.id || v._id?.toString()) === id);
  if (!vol) throw new Error('Not found');
  if (vol.status !== 'ABERTO') throw new Error('volume fechado');
  const operatorIdHeader = deps.operatorId;
  const operatorId = typeof operatorIdHeader === 'string' ? operatorIdHeader : (Array.isArray(vol.anacOperatorIds) ? vol.anacOperatorIds[0] : '');
  if (!operatorId) throw new Error('operator id required');
  if (vol.anacVolumeId) {
    await deps.anacService.updateVolumeOnAnac(vol.anacVolumeId, operatorId, {
      numeroVolume: body.numeroVolume,
      minutosTotaisVoo: body.minutosTotaisVoo,
      totalPousos: body.totalPousos,
      totalCiclosCelula: body.totalCiclosCelula,
      observacoesTermoDeAbertura: body.observacoesTermoDeAbertura,
      horasVooMotor: body.horasVooMotor,
      ciclosMotor: body.ciclosMotor
    });
  }
  const updated = await deps.volumeService.updateVolume(id, body);
  return updated;
}
