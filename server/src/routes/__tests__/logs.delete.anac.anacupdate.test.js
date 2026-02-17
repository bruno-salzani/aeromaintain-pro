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
        blockTimeHours: 1,
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
        status: 'ABERTO',
        numeroVolume: '01/PR-XXX/2025',
        anacVolumeId: 'ANAC-V-1',
        minutosTotaisVooInicio: 1000,
        totalPousosInicio: 10,
        totalCiclosCelulaInicio: 10,
        horasVooMotor: { '1': '148:00', '2': '90:00' },
        ciclosMotor: { '1': '100', '2': '35' },
        save
      })
    }
  };
});

vi.mock('../../services/anacService.js', () => ({
  deleteFlightOnAnac: vi.fn().mockResolvedValue(true),
  updateVolumeOnAnac: vi.fn().mockResolvedValue(true)
}));

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

import { router as logsRouter } from '../logs.js';
import { updateVolumeOnAnac } from '../../services/anacService.js';

describe('DELETE /api/logs/:id/anac envia update para ANAC do Volume', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('chama updateVolumeOnAnac com payload recalculado', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/logs', logsRouter);
    const res = await request(app).delete('/api/logs/l1/anac').set('aircompany', 'OP1');
    expect(res.status).toBe(200);
    expect(res.body.anac).toBeDefined();
    expect(res.body.anac.volumeUpdate).toBe(true);
    expect(updateVolumeOnAnac).toHaveBeenCalledTimes(1);
    const call = updateVolumeOnAnac.mock.calls[0];
    expect(call[0]).toBe('ANAC-V-1');
    expect(call[1]).toBe('OP1');
    expect(call[2].numeroVolume).toBe('01/PR-XXX/2025');
    expect(call[2].minutosTotaisVoo).toBe(45);
    expect(call[2].totalPousos).toBe(1);
    expect(call[2].totalCiclosCelula).toBe(2);
  });
});
