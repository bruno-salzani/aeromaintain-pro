import { Component } from '../models/component.js';
import { Aircraft } from '../models/aircraft.js';
import { ComponentRepository } from '../infra/repositories/ComponentRepository.js';
import { AircraftRepository } from '../infra/repositories/AircraftRepository.js';

export async function listComponents() {
  const repo = new ComponentRepository();
  return repo.list();
}

export async function addComponent(data) {
  const aircraftRepo = new AircraftRepository();
  const componentRepo = new ComponentRepository();
  const aircraft = await aircraftRepo.findOne();
  const remainingHours = computeRemainingHours(data.lifeLimitHours, aircraft.totalHours, data.installedHours);
  return componentRepo.create({ ...data, aircraftId: aircraft._id, remainingHours });
}

export async function updateComponent(id, data) {
  const repo = new ComponentRepository();
  return repo.updateById(id, data);
}

export async function deleteComponent(id) {
  const repo = new ComponentRepository();
  return repo.deleteById(id);
}

export function computeRemainingHours(lifeLimitHours, aircraftTotalHours, installedHours) {
  if (lifeLimitHours === undefined) return undefined;
  return lifeLimitHours - ((aircraftTotalHours || 0) - (installedHours || 0));
}
