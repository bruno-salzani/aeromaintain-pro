import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { router as volumesRouter } from '../volumes.js';

vi.mock('../../services/anacService.js', () => ({
  openVolumeOnAnac: vi.fn().mockResolvedValue({ volId: 'ANAC-V-1', opIds: ['OP1', 'OP2'] })
}));

vi.mock('../../services/volumeService.js', () => ({
  listVolumes: vi.fn(async () => []),
  openVolume: vi.fn(async (data) => ({ ...data, id: 'local-1', status: 'ABERTO' }))
}));

describe('POST /api/volumes/open', () => {
  it('opens volume and integrates with ANAC', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/volumes', volumesRouter);
    const res = await request(app).post('/api/volumes/open').send({
      numeroVolume: '01/PT-AAA/2025',
      matriculaAeronave: 'PT-AAA',
      minutosTotaisVooInicio: 60,
      totalPousosInicio: 10,
      totalCiclosCelulaInicio: 10
    });
    expect(res.status).toBe(201);
  });
});
