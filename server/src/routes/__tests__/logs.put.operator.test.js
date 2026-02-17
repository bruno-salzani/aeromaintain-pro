import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../../models/log.js', () => {
  return {
    Log: {
      findById: vi.fn().mockResolvedValue({
        _id: 'l1',
        volumeId: 'v1',
        anacEtapaId: 'E1',
        anacOperatorId: 'OP1',
        blockTimeHours: 1,
        numeroCicloEtapa: 2,
        save: vi.fn()
      })
    }
  };
});

vi.mock('../../models/volume.js', () => {
  return {
    Volume: {
      findById: vi.fn().mockResolvedValue({
        _id: 'v1',
        status: 'ABERTO'
      })
    }
  };
});

vi.mock('../../models/aircraft.js', () => {
  return {
    Aircraft: {
      findOne: vi.fn().mockResolvedValue({
        totalHours: 100,
        totalCycles: 50,
        save: vi.fn()
      })
    }
  };
});

vi.mock('../../services/anacService.js', () => ({
  updateFlightOnAnac: vi.fn().mockResolvedValue('E2')
}));

import { router as logsRouter } from '../logs.js';
import { updateFlightOnAnac } from '../../services/anacService.js';

describe('PUT /api/logs/:id operador diferente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejeita quando aircompany difere do criador', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/logs', logsRouter);
    const body = {
      naturezaVoo: '6',
      siglaAerodromoDecolagem: 'SBBR',
      siglaAerodromoPouso: 'SBGR',
      horarioPartida: '2025-04-01T10:00:00Z',
      horarioDecolagem: '2025-04-01T10:10:00Z',
      horarioPouso: '2025-04-01T11:00:00Z',
      horarioCorteMotores: '2025-04-01T11:05:00Z',
      tempoVooTotal: '00:50',
      quantidadePessoasVoo: 2,
      totalCombustivel: '300',
      unidadeCombustivel: 'L',
      numeroPousoEtapa: 1,
      numeroCicloEtapa: 2,
      aeronautas: [{ aeronautaBrasileiro: true, numeroDocumento: '07711611123', funcao: '1' }]
    };
    const res = await request(app).put('/api/logs/l1').set('aircompany', 'OP2').send(body);
    expect(res.status).toBe(403);
    expect(res.body.error).toBeDefined();
    expect(updateFlightOnAnac).not.toHaveBeenCalled();
  });
});
