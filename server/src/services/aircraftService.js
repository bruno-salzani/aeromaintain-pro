import { Aircraft } from '../models/aircraft.js';
import { AircraftRepository } from '../infra/repositories/AircraftRepository.js';

export async function getOrCreateAircraft(initial) {
  const repo = new AircraftRepository();
  const found = await Aircraft.findOne({ registration: initial.registration });
  if (found) return found;
  const created = await Aircraft.create(initial);
  return created;
}

export async function updateAircraft(data) {
  const repo = new AircraftRepository();
  const doc = await repo.findOne();
  if (!doc) throw new Error('Aircraft not initialized');
  Object.assign(doc, data);
  await repo.save(doc);
  return doc;
}
