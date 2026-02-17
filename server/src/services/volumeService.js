import { Volume } from '../models/volume.js';
import { VolumeRepository } from '../infra/repositories/VolumeRepository.js';

export async function listVolumes() {
  const repo = new VolumeRepository();
  return repo.list();
}

export async function openVolume(data) {
  const repo = new VolumeRepository();
  const active = await repo.findOpenVolume();
  if (active) throw new Error('Já existe um volume aberto');
  return repo.create({ ...data, status: 'ABERTO' });
}

export async function closeVolume(id, observations, dateIso) {
  const repo = new VolumeRepository();
  const doc = await repo.findById(id);
  if (!doc) return null;
  doc.status = 'FECHADO';
  doc.dataFechamento = dateIso || new Date().toISOString();
  doc.observacoesFechamento = observations;
  await repo.save(doc);
  return doc.toObject ? doc.toObject() : doc;
}

export async function updateVolume(id, data) {
  const repo = new VolumeRepository();
  const doc = await repo.findById(id);
  if (!doc) return null;
  if (doc.status !== 'ABERTO') throw new Error('Volume fechado');
  if (typeof data.numeroVolume === 'string') doc.numeroVolume = data.numeroVolume;
  if (typeof data.minutosTotaisVoo === 'number') doc.minutosTotaisVooInicio = data.minutosTotaisVoo;
  if (typeof data.totalPousos === 'number') doc.totalPousosInicio = data.totalPousos;
  if (typeof data.totalCiclosCelula === 'number') doc.totalCiclosCelulaInicio = data.totalCiclosCelula;
  if (typeof data.observacoesTermoDeAbertura === 'string') doc.observacoesAbertura = data.observacoesTermoDeAbertura;
  if (data.horasVooMotor) doc.horasVooMotor = data.horasVooMotor;
  if (data.ciclosMotor) doc.ciclosMotor = data.ciclosMotor;
  await repo.save(doc);
  return doc.toObject ? doc.toObject() : doc;
}
