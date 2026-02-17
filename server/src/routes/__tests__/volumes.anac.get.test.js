import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { router as volumesRouter } from '../volumes.js';

vi.mock('../../services/anacService.js', () => ({
  fetchVolumeOnAnac: vi.fn().mockResolvedValue({
    numeroVolume: '01/PR-XXX/2025',
    minutosTotaisVoo: '1234',
    totalPousos: '222',
    totalCiclosCelula: '200',
    horasVooMotor: { '1': '148:00', '2': '90:00' },
    ciclosMotor: { '1': '100', '2': '35' }
  })
}));

vi.mock('../../services/volumeService.js', () => {
  const vol = {
    id: 'local-1',
    status: 'ABERTO',
    anacVolumeId: 'ANAC-V-1',
    anacOperatorIds: ['OP1', 'OP2'],
    numeroVolume: '01/PR-XXX/2025'
  };
  return {
    listVolumes: vi.fn(async () => [vol]),
  };
});

describe('GET /api/volumes/:id/anac', () => {
  it('fetches current ANAC volume data', async () => {
    const app = express();
    app.use('/api/volumes', volumesRouter);
    const res = await request(app).get('/api/volumes/local-1/anac').set('aircompany', 'OP1');
    expect(res.status).toBe(200);
    expect(res.body.numeroVolume).toBe('01/PR-XXX/2025');
    expect(res.body.minutosTotaisVoo).toBe('1234');
  });
});
