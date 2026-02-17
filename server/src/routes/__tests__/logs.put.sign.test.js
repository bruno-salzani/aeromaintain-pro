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

describe('PUT /api/logs/:id/assinar-operador', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('aceita apenas com aircompany correto e persiste assinatura', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/logs', logsRouter);
    const res = await request(app)
      .put('/api/logs/l1/assinar-operador')
      .set('aircompany', 'OP1')
      .send({ dataHorarioAssinaturaOperador: '2025-05-25T18:59:00.000Z' });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/Etapa assinada com sucesso/);
    expect(signOperatorOnAnac).toHaveBeenCalledWith('E1', 'OP1', '2025-05-25T18:59:00.000Z');
  });
});
