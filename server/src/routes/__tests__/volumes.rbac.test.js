import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
process.env.ROLES_ENFORCED = '1';
process.env.ADMIN_API_KEY = '';

vi.mock('../../services/volumeService.js', () => ({
  listVolumes: vi.fn(async () => []),
  openVolume: vi.fn(async (b) => ({ id: 'local-1', status: 'ABERTO', ...b })),
  closeVolume: vi.fn(async (id) => ({ id, status: 'FECHADO' })),
  updateVolume: vi.fn(async (id, b) => ({ id, status: 'ABERTO', ...b }))
}));

vi.mock('../../services/anacService.js', () => ({
  openVolumeOnAnac: vi.fn(async () => ({ volId: 'ANAC-V-1', opIds: ['OP1'] })),
  closeVolumeOnAnac: vi.fn(async () => true),
  closeVolumePutOnAnac: vi.fn(async () => ({ ok: true })),
  updateVolumeOnAnac: vi.fn(async () => true),
  fetchVolumeOnAnac: vi.fn(async () => ({ ok: true }))
}));

describe('RBAC Volumes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bloqueia POST /open sem role permitido', async () => {
    const { router: volumesRouter } = await import('../volumes.js');
    const app = express();
    app.use(express.json());
    app.use('/api/volumes', volumesRouter);
    const res = await request(app).post('/api/volumes/open').send({
      numeroVolume: '01/PR-XXX/2025',
      matriculaAeronave: 'PRXXX',
      minutosTotaisVooInicio: 0,
      totalPousosInicio: 0,
      totalCiclosCelulaInicio: 0
    });
    expect(res.status).toBe(403);
  });

  it('permite POST /open com role OPERACOES', async () => {
    const { router: volumesRouter } = await import('../volumes.js');
    const app = express();
    app.use(express.json());
    app.use('/api/volumes', volumesRouter);
    const res = await request(app).post('/api/volumes/open').set('x-role', 'OPERACOES').send({
      numeroVolume: '01/PR-XXX/2025',
      matriculaAeronave: 'PRXXX',
      minutosTotaisVooInicio: 0,
      totalPousosInicio: 0,
      totalCiclosCelulaInicio: 0
    });
    expect(res.status).toBe(201);
  });
});
