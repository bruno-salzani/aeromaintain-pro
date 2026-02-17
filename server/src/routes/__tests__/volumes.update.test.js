import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { router as volumesRouter } from '../volumes.js';

vi.mock('../../services/anacService.js', () => ({
  updateVolumeOnAnac: vi.fn().mockResolvedValue(true)
}));

vi.mock('../../services/volumeService.js', () => {
  const vol = {
    id: 'local-1',
    status: 'ABERTO',
    anacVolumeId: 'ANAC-V-1',
    anacOperatorIds: ['OP1', 'OP2'],
    numeroVolume: '01/PR-XXX/2025',
    minutosTotaisVooInicio: 100,
    totalPousosInicio: 10,
    totalCiclosCelulaInicio: 10
  };
  return {
    listVolumes: vi.fn(async () => [vol]),
    updateVolume: vi.fn(async () => ({ ...vol, minutosTotaisVooInicio: 1265 }))
  };
});

describe('PUT /api/volumes/:id', () => {
  it('updates volume and integrates with ANAC', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/volumes', volumesRouter);
    const res = await request(app).put('/api/volumes/local-1').set('aircompany', 'OP1').send({
      numeroVolume: '01/PR-XXX/2025',
      minutosTotaisVoo: 1265,
      totalPousos: 120,
      totalCiclosCelula: 115,
      observacoesTermoDeAbertura: 'Observações abertura',
      horasVooMotor: { '1': '148:00', '2': '90:00' },
      ciclosMotor: { '1': '100', '2': '35' }
    });
    expect(res.status).toBe(200);
    expect(res.body.minutosTotaisVooInicio).toBe(1265);
  });
});
