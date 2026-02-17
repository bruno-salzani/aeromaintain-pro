function generateHash(data) {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'ANAC-DBE-' + Math.abs(hash).toString(16).toUpperCase();
}

export async function registerFlight(input, deps) {
  const vol = await deps.volumeRepo.findOpenVolume();
  if (!vol) throw new Error('Sem volume aberto');
  const abertura = vol.dataAbertura ? new Date(vol.dataAbertura) : null;
  const startIso = input.horarioDecolagem || input.horarioPartida;
  const endIso = input.horarioPouso || input.horarioCorteMotores;
  const dep = new Date(startIso);
  const arr = new Date(endIso);
  if (abertura && dep.getTime() <= abertura.getTime()) {
    throw new Error('Etapa com data anterior ou igual à abertura do volume');
  }
  if (input.numeroPousoEtapa > 0) {
    const partida = new Date(input.horarioPartida);
    const decolagem = new Date(input.horarioDecolagem);
    const pouso = new Date(input.horarioPouso);
    const corte = new Date(input.horarioCorteMotores);
    if (partida.getTime() > decolagem.getTime()) throw new Error('Partida deve ser anterior ou igual à Decolagem');
    if (decolagem.getTime() > pouso.getTime()) throw new Error('Decolagem deve ser anterior ou igual ao Pouso');
    if (pouso.getTime() > corte.getTime()) throw new Error('Pouso deve ser anterior ou igual ao Corte');
  } else {
    const partida = new Date(input.horarioPartida);
    const corte = new Date(input.horarioCorteMotores);
    if (partida.getTime() > corte.getTime()) throw new Error('Partida deve ser anterior ou igual ao Corte');
  }
  const diffMs = arr.getTime() - dep.getTime();
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffMins = Math.floor((diffMs % 3600000) / 60000);
  const tempoVooTotal = `${String(diffHrs).padStart(2, '0')}:${String(diffMins).padStart(2, '0')}`;
  const blockTimeHours = diffMs / 3600000;
  const civ = deps.civClassifier.classify(input.naturezaVoo, input.aeronautas || []);
  const created = await deps.flightLogRepo.create({
    ...input,
    volumeId: vol._id,
    tempoVooTotal,
    dataHorarioAssinaturaPiloto: input.dataHorarioAssinaturaPiloto || new Date().toISOString(),
    dataHorarioAssinaturaOperador: input.dataHorarioAssinaturaOperador || new Date().toISOString(),
    isLocked: true,
    hashIntegridade: generateHash({ ...input, tempoVooTotal }),
    blockTimeHours,
    civClassification: civ || undefined
  });
  const anacPayload = {
    idDiarioBordoVolume: vol.anacVolumeId || undefined,
    idDiarioBordoOperador: (vol.anacOperatorIds && vol.anacOperatorIds[0]) || undefined,
    naturezaVoo: input.naturezaVoo,
    siglaAerodromoDecolagem: input.siglaAerodromoDecolagem,
    latitudeDecolagem: input.latitudeDecolagem || undefined,
    longitudeDecolagem: input.longitudeDecolagem || undefined,
    localDecolagem: input.localDecolagem || undefined,
    siglaAerodromoPouso: input.siglaAerodromoPouso,
    latitudePouso: input.latitudePouso || undefined,
    longitudePouso: input.longitudePouso || undefined,
    localPouso: input.localPouso || undefined,
    horarioPartida: input.horarioPartida,
    horarioDecolagem: input.horarioDecolagem || undefined,
    horarioPouso: input.horarioPouso || undefined,
    horarioCorteMotores: input.horarioCorteMotores,
    tempoVooTotal,
    tempoVooDiurno: input.tempoVooDiurno || undefined,
    tempoVooNoturno: input.tempoVooNoturno || undefined,
    tempoVooIFR: input.tempoVooIFR || undefined,
    tempoVooIFRC: input.tempoVooIFRC || undefined,
    quantidadePessoasVoo: input.quantidadePessoasVoo || undefined,
    cargaTransportada: input.cargaTransportada || undefined,
    unidadeCargaTransportada: input.unidadeCargaTransportada || undefined,
    totalCombustivel: input.totalCombustivel || undefined,
    unidadeCombustivel: input.unidadeCombustivel || undefined,
    milhasNavegacao: input.milhasNavegacao || undefined,
    minutosNavegacao: input.minutosNavegacao || undefined,
    aeronautas: input.aeronautas || [],
    ocorrencia: input.ocorrencia || undefined,
    dataHorarioAssinaturaPiloto: input.dataHorarioAssinaturaPiloto || undefined,
    dataHorarioAssinaturaOperador: input.dataHorarioAssinaturaOperador || undefined
  };
  const etapaId = await deps.anacGateway.postFlight(anacPayload);
  if (etapaId) {
    const saved = await deps.flightLogRepo.findById(created._id);
    saved.anacEtapaId = etapaId;
    saved.anacOperatorId = anacPayload.idDiarioBordoOperador || '';
    await deps.flightLogRepo.save(saved);
  }
  const aircraft = await deps.aircraftRepo.findOne();
  await deps.updateMaintenanceByFlightStage({ blockTimeHours, numeroCicloEtapa: input.numeroCicloEtapa || 0 }, deps);
  return created;
}
