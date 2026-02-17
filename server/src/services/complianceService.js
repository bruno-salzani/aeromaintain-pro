import { ComplianceItem } from '../models/complianceItem.js';
import { ComplianceRepository } from '../infra/repositories/ComplianceRepository.js';

export async function listCompliance() {
  const repo = new ComplianceRepository();
  return repo.list();
}

export async function addCompliance(data) {
  const repo = new ComplianceRepository();
  return repo.create(data);
}

export async function deleteCompliance(id) {
  const repo = new ComplianceRepository();
  return repo.deleteById(id);
}
