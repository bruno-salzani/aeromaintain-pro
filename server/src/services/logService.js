import { Log } from '../models/log.js';
import { postFlightOnAnac } from './anacService.js';
import { classifyCiv } from './civService.js';
import { FlightLogRepository } from '../infra/repositories/FlightLogRepository.js';
import { VolumeRepository } from '../infra/repositories/VolumeRepository.js';
import { AircraftRepository } from '../infra/repositories/AircraftRepository.js';
import { ComponentRepository } from '../infra/repositories/ComponentRepository.js';
import { ComponentSnapshotRepository } from '../infra/repositories/ComponentSnapshotRepository.js';
 

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

export async function listLogs() {
  const repo = new FlightLogRepository();
  const volRepo = new VolumeRepository();
  const vol = await volRepo.findOpenVolume();
  if (!vol) return [];
  return Log.find({ volumeId: vol._id }).lean();
}

export async function addLog(data) {
  const volRepo = new VolumeRepository();
  const logRepo = new FlightLogRepository();
  const aircraftRepo = new AircraftRepository();
  const componentRepo = new ComponentRepository();
  const snapRepo = new ComponentSnapshotRepository();
  const vol = await volRepo.findOpenVolume();
  if (!vol) throw new Error('Sem volume aberto');
  const abertura = vol.dataAbertura ? new Date(vol.dataAbertura) : null;
  const startIso = data.horarioDecolagem || data.horarioPartida;
  const endIso = data.horarioPouso || data.horarioCorteMotores;
  const dep = new Date(startIso);
  const arr = new Date(endIso);
  if (abertura && dep.getTime() <= abertura.getTime()) {
    throw new Error('Etapa com data anterior ou igual à abertura do volume');
  }
  if (data.numeroPousoEtapa > 0) {
    if (!data.horarioDecolagem || !data.horarioPouso) {
      throw new Error('Decolagem e Pouso são obrigatórios quando há pouso');
    }
    const partida = new Date(data.horarioPartida);
    const decolagem = new Date(data.horarioDecolagem);
    const pouso = new Date(data.horarioPouso);
    const corte = new Date(data.horarioCorteMotores);
    if (partida.getTime() > decolagem.getTime()) throw new Error('Partida deve ser anterior ou igual à Decolagem');
    if (decolagem.getTime() > pouso.getTime()) throw new Error('Decolagem deve ser anterior ou igual ao Pouso');
    if (pouso.getTime() > corte.getTime()) throw new Error('Pouso deve ser anterior ou igual ao Corte');
  } else {
    const partida = new Date(data.horarioPartida);
    const corte = new Date(data.horarioCorteMotores);
    if (partida.getTime() > corte.getTime()) throw new Error('Partida deve ser anterior ou igual ao Corte');
  }
  const diffMs = arr.getTime() - dep.getTime();
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffMins = Math.floor((diffMs % 3600000) / 60000);
  const tempoVooTotal = `${String(diffHrs).padStart(2, '0')}:${String(diffMins).padStart(2, '0')}`;
  const blockTimeHours = diffMs / 3600000;
  const civ = classifyCiv(data.naturezaVoo, data.aeronautas || []);
  const doc = await logRepo.create({
    ...data,
    volumeId: vol._id,
    tempoVooTotal,
    dataHorarioAssinaturaPiloto: data.dataHorarioAssinaturaPiloto || new Date().toISOString(),
    dataHorarioAssinaturaOperador: data.dataHorarioAssinaturaOperador || new Date().toISOString(),
    isLocked: true,
    hashIntegridade: generateHash({ ...data, tempoVooTotal }),
    blockTimeHours,
    civClassification: civ || undefined
  });
  const anacPayload = {
    idDiarioBordoVolume: vol.anacVolumeId || undefined,
    idDiarioBordoOperador: (vol.anacOperatorIds && vol.anacOperatorIds[0]) || undefined,
    naturezaVoo: data.naturezaVoo,
    siglaAerodromoDecolagem: data.siglaAerodromoDecolagem,
    latitudeDecolagem: data.latitudeDecolagem || undefined,
    longitudeDecolagem: data.longitudeDecolagem || undefined,
    localDecolagem: data.localDecolagem || undefined,
    siglaAerodromoPouso: data.siglaAerodromoPouso,
    latitudePouso: data.latitudePouso || undefined,
    longitudePouso: data.longitudePouso || undefined,
    localPouso: data.localPouso || undefined,
    horarioPartida: data.horarioPartida,
    horarioDecolagem: data.horarioDecolagem,
    horarioPouso: data.horarioPouso,
    horarioCorteMotores: data.horarioCorteMotores,
    tempoVooTotal,
    tempoVooDiurno: data.tempoVooDiurno || undefined,
    tempoVooNoturno: data.tempoVooNoturno || undefined,
    tempoVooIFR: data.tempoVooIFR || undefined,
    tempoVooIFRC: data.tempoVooIFRC || undefined,
    numeroPousoEtapa: data.numeroPousoEtapa,
    numeroCicloEtapa: data.numeroCicloEtapa,
    quantidadePessoasVoo: data.quantidadePessoasVoo || undefined,
    cargaTransportada: data.cargaTransportada || undefined,
    unidadeCargaTransportada: data.unidadeCargaTransportada || undefined,
    totalCombustivel: data.totalCombustivel || undefined,
    unidadeCombustivel: data.unidadeCombustivel || undefined,
    milhasNavegacao: data.milhasNavegacao || undefined,
    minutosNavegacao: data.minutosNavegacao || undefined,
    aeronautas: data.aeronautas || [],
    ocorrencia: data.ocorrencia || undefined,
    dataHorarioAssinaturaPiloto: data.dataHorarioAssinaturaPiloto || undefined,
    dataHorarioAssinaturaOperador: data.dataHorarioAssinaturaOperador || undefined
  };
  const etapaId = await postFlightOnAnac(anacPayload);
  if (etapaId) {
    const saved = await logRepo.findById(doc._id);
    saved.anacEtapaId = etapaId;
    saved.anacOperatorId = anacPayload.idDiarioBordoOperador || '';
    await logRepo.save(saved);
  }
  const aircraft = await aircraftRepo.findOne();
  aircraft.totalHours = (aircraft.totalHours || 0) + blockTimeHours;
  aircraft.totalCycles = (aircraft.totalCycles || 0) + (data.numeroCicloEtapa || 0);
  await aircraftRepo.save(aircraft);
  const comps = await componentRepo.findWithRemaining();
  for (const c of comps) {
    const newRemaining = (c.remainingHours || 0) - blockTimeHours;
    c.remainingHours = newRemaining;
    c.status = newRemaining < 0 ? 'VENCIDO' : newRemaining < 50 ? 'CRITICO' : 'OK';
    await componentRepo.save(c);
    await snapRepo.create({
      componentId: c._id?.toString() || c.id || '',
      remainingHours: c.remainingHours,
      status: c.status,
      meta: { deltaHours: blockTimeHours }
    });
  }
  return doc;
}

export async function deleteLog(id) {
  const logRepo = new FlightLogRepository();
  const aircraftRepo = new AircraftRepository();
  const doc = await logRepo.findById(id);
  if (!doc) return false;
  if (doc.isLocked) throw new Error('Registro bloqueado');
  const blockTime = doc.blockTimeHours || 0;
  const aircraft = await aircraftRepo.findOne();
  aircraft.totalHours = Math.max(0, (aircraft.totalHours || 0) - blockTime);
  aircraft.totalCycles = Math.max(0, (aircraft.totalCycles || 0) - (doc.numeroCicloEtapa || 0));
  await aircraftRepo.save(aircraft);
  doc.deleted = true;
  await logRepo.save(doc);
  return true;
}
