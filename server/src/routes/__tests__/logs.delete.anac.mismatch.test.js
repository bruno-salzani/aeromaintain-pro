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

vi.mock('../../services/anacService.js', () => ({
  deleteFlightOnAnac: vi.fn().mockResolvedValue(true)
}));

import { router as logsRouter } from '../logs.js';
import { deleteFlightOnAnac } from '../../services/anacService.js';

describe('DELETE /api/logs/:id/anac operador diferente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejeita 403 quando aircompany difere do criador', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/logs', logsRouter);
    const res = await request(app).delete('/api/logs/l1/anac').set('aircompany', 'OP2');
    expect(res.status).toBe(403);
    expect(res.body.error).toBeDefined();
    expect(deleteFlightOnAnac).not.toHaveBeenCalled();
  });
});
