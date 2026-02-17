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
        numeroCicloEtapa: 2,
        blockTimeHours: 1, // 60 min
        deleted: false,
        save: vi.fn()
      }),
      find: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          { blockTimeHours: 0.5, numeroPousoEtapa: 1, numeroCicloEtapa: 1 },
          { blockTimeHours: 0.25, numeroPousoEtapa: 0, numeroCicloEtapa: 1 }
        ])
      })
    }
  };
});

vi.mock('../../models/volume.js', () => {
  const save = vi.fn();
  return {
    Volume: {
      findById: vi.fn().mockResolvedValue({
        _id: 'v1',
        status: 'FECHADO',
        minutosTotaisVooInicio: 1000,
        totalPousosInicio: 10,
        totalCiclosCelulaInicio: 10,
        horasVooMotor: { '1': '10:00' },
        ciclosMotor: { '1': '10' },
        save
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
  deleteFlightOnAnac: vi.fn().mockResolvedValue(true)
}));

import { router as logsRouter } from '../logs.js';
import { Volume } from '../../models/volume.js';

describe('DELETE /api/logs/:id/anac recalcula engines volume FECHADO', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('subtrai delta de horas e ciclos dos motores em volume fechado', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/logs', logsRouter);
    const res = await request(app).delete('/api/logs/l1/anac').set('aircompany', 'OP1');
    expect(res.status).toBe(200);
    const vol = await Volume.findById.mock.results[0].value;
    expect(vol.horasVooMotor['1']).toBe('9:00'); // 10:00 - 60min
    expect(vol.ciclosMotor['1']).toBe('8'); // 10 - 2
  });
});
