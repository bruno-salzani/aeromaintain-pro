import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../../services/logService.js', () => ({
  listLogs: vi.fn(),
  addLog: vi.fn(async (body) => ({ ...body, _id: 'l1' })),
  deleteLog: vi.fn()
}));

import { router as logsRouter } from '../logs.js';

describe('POST /api/logs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('aceita etapa sem decolagem/pouso quando numeroPousoEtapa = 0', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/logs', logsRouter);
    const body = {
      volumeId: 'v1',
      naturezaVoo: '4',
      siglaAerodromoDecolagem: 'SBBR',
      horarioPartida: '2025-04-01T10:00:00Z',
      horarioCorteMotores: '2025-04-01T11:00:00Z',
      tempoVooTotal: '01:00',
      quantidadePessoasVoo: 2,
      totalCombustivel: '500',
      unidadeCombustivel: 'L',
      numeroPousoEtapa: 0,
      numeroCicloEtapa: 0,
      aeronautas: [{ aeronautaBrasileiro: true, numeroDocumento: '07711611123', funcao: '1' }]
    };
    const res = await request(app).post('/api/logs').send(body);
    expect(res.status).toBe(201);
    expect(res.body._id).toBeDefined();
  });

  it('exige decolagem e pouso quando numeroPousoEtapa > 0', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/logs', logsRouter);
    const body = {
      volumeId: 'v1',
      naturezaVoo: '4',
      siglaAerodromoDecolagem: 'SBBR',
      siglaAerodromoPouso: 'SBGR',
      horarioPartida: '2025-04-01T10:00:00Z',
      horarioCorteMotores: '2025-04-01T11:00:00Z',
      tempoVooTotal: '01:00',
      quantidadePessoasVoo: 2,
      totalCombustivel: '500',
      unidadeCombustivel: 'L',
      numeroPousoEtapa: 1,
      numeroCicloEtapa: 1,
      aeronautas: [{ aeronautaBrasileiro: true, numeroDocumento: '07711611123', funcao: '1' }]
    };
    const res = await request(app).post('/api/logs').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

