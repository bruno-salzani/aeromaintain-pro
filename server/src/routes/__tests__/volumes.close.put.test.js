import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { router as volumesRouter } from '../volumes.js';

vi.mock('../../services/anacService.js', () => ({
  closeVolumePutOnAnac: vi.fn().mockResolvedValue({ volumeId: 1367 })
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
    closeVolume: vi.fn(async (id, obs, dateIso) => ({ ...vol, status: 'FECHADO', dataFechamento: dateIso, observacoesFechamento: obs }))
  };
});

describe('PUT /api/volumes/:id/close', () => {
  it('closes volume with ANAC closeVolume PUT', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/volumes', volumesRouter);
    const res = await request(app).put('/api/volumes/local-1/close').set('aircompany', 'OP1').send({
      dataFechamentoVolume: '01/04/2025',
      minutosTotaisVoo: 1800,
      totalPousos: 215,
      totalCiclosCelula: 180,
      observacoesTermoDeFechamento: 'Observacoes fechamento',
      horasVooMotor: { '1': '223:00', '2': '263:00' },
      ciclosMotor: { '1': '45', '2': '80' }
    });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('FECHADO');
    expect(res.body.anac.volumeId).toBe(1367);
  });
});
