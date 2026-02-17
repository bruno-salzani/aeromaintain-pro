import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { router as volumesRouter } from '../volumes.js';

vi.mock('../../services/anacService.js', () => ({
  queryVolumesOnAnac: vi.fn(async () => ([
    {
      volumeId: 1143,
      nrVolume: '01/PR-XXX/2025',
      qtMinutoTotalInicio: 30,
      qtMinutoTotalFim: 120,
      qtPousoTotalInicio: 10,
      qtPousoTotalFim: 15,
      qtCicloTotalInicio: 10,
      qtCicloTotalFim: 15,
      dsObservacoesTermoDeAbertura: 'Teste volume',
      dsObservacoesTermoDeFechamento: 'teste',
      diarioBordoAeronave: { nrMatricula: 'PRXXX' },
      motorVolumes: [
        { quantidadeHoraFinalMotor: 123.0, cicloMotorFinal: 32 },
        { quantidadeHoraFinalMotor: 70.0, cicloMotorFinal: 50 }
      ]
    }
  ]))
}));

describe('GET /api/volumes/anac query', () => {
  it('returns list of volumes from ANAC query', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/volumes', volumesRouter);
    const res = await request(app).get('/api/volumes/anac?nrMatricula=PRXXX');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].nrVolume).toBe('01/PR-XXX/2025');
  });
});
