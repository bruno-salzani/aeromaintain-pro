export async function openVolumeUC(body, deps) {
  const list = await deps.volumeService.listVolumes();
  const arr = Array.isArray(list) ? list : [];
  const active = arr.find(v => v.status === 'ABERTO');
  if (active && body.autoClose) {
    await deps.volumeService.closeVolume(active.id || active._id?.toString(), 'Encerrado automaticamente para abertura de novo volume');
    if (active.anacVolumeId) await deps.anacService.closeVolumeOnAnac(active.anacVolumeId);
  } else if (active && !body.autoClose) {
    throw new Error('volume aberto');
  }
  const { volId, opIds } = await deps.anacService.openVolumeOnAnac({
    numeroVolume: body.numeroVolume,
    matriculaAeronave: body.matriculaAeronave,
    dataAbertura: body.dataAbertura,
    minutosTotaisVoo: body.minutosTotaisVooInicio,
    totalPousos: body.totalPousosInicio,
    totalCiclosCelula: body.totalCiclosCelulaInicio,
    observacoesTermoDeAbertura: body.observacoesAbertura,
    horasVooMotor: body.horasVooMotor,
    ciclosMotor: body.ciclosMotor
  });
  const vol = await deps.volumeService.openVolume({ ...body, anacVolumeId: volId, anacOperatorIds: opIds });
  return vol;
}
