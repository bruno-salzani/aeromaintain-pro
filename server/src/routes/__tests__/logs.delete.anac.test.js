import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../../models/log.js', () => {
  return {
    Log: {
      findById: vi.fn().mockResolvedValue({
        _id: 'l1',
        anacEtapaId: 'E1',
        anacOperatorId: 'OP1',
        numeroCicloEtapa: 2,
        blockTimeHours: 1,
        deleted: false,
        save: vi.fn()
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

vi.mock('../../models/volume.js', () => {
  return {
    Volume: {
      findById: vi.fn().mockResolvedValue({
        _id: 'v1',
        status: 'ABERTO',
        save: vi.fn()
      })
    }
  };
});

vi.mock('../../services/anacService.js', () => ({
  deleteFlightOnAnac: vi.fn().mockResolvedValue(true)
}));

import { router as logsRouter } from '../logs.js';
import { deleteFlightOnAnac } from '../../services/anacService.js';
import { Log } from '../../models/log.js';

describe('DELETE /api/logs/:id/anac', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Log.find = vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        { blockTimeHours: 0.5, numeroPousoEtapa: 1, numeroCicloEtapa: 1 },
        { blockTimeHours: 0.25, numeroPousoEtapa: 0, numeroCicloEtapa: 1 }
      ])
    });
  });

  it('marca deleted e ajusta totais da aeronave', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/logs', logsRouter);
    const res = await request(app).delete('/api/logs/l1/anac').set('aircompany', 'OP1');
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/Registro excluído com sucesso/);
    expect(res.body.meta.minutosTotaisVoo).toBe(45); // 0.75h -> 45 min
    expect(res.body.meta.totalPousos).toBe(1);
    expect(res.body.meta.totalCiclosCelula).toBe(2);
    expect(res.body.anac).toBeDefined();
    expect(res.body.anac.etapaDelete).toBe(true);
    expect(deleteFlightOnAnac).toHaveBeenCalledWith('E1', 'OP1');
    // save foi chamado para persistir a flag deleted
    const doc = await Log.findById.mock.results[0].value;
    expect(doc.save).toHaveBeenCalled();
  });
});
