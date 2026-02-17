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
        dataHorarioAssinaturaOperador: '',
        save: vi.fn()
      })
    }
  };
});

vi.mock('../../services/anacService.js', () => ({
  signOperatorOnAnac: vi.fn().mockResolvedValue(true)
}));

import { router as logsRouter } from '../logs.js';
import { signOperatorOnAnac } from '../../services/anacService.js';

describe('PUT /api/logs/:id/assinar-operador sem aircompany', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 400 e não chama ANAC', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/logs', logsRouter);
    const res = await request(app)
      .put('/api/logs/l1/assinar-operador')
      .send({ dataHorarioAssinaturaOperador: '2025-05-25T18:59:00.000Z' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(signOperatorOnAnac).not.toHaveBeenCalled();
  });
});
