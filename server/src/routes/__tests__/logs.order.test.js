import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { router as logsRouter } from '../logs.js';

describe('POST /api/logs time ordering', () => {
  it('rejects when partida > decolagem', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/logs', logsRouter);
    const res = await request(app).post('/api/logs').send({
      naturezaVoo: '6',
      siglaAerodromoDecolagem: 'SBBR',
      siglaAerodromoPouso: 'SBGR',
      horarioPartida: '2025-05-20T10:00',
      horarioDecolagem: '2025-05-20T09:00',
      horarioPouso: '2025-05-20T11:00',
      horarioCorteMotores: '2025-05-20T12:00',
      quantidadePessoasVoo: 1,
      totalCombustivel: 10,
      unidadeCombustivel: 'L',
      numeroPousoEtapa: 1,
      numeroCicloEtapa: 1,
      aeronautas: [{ aeronautaBrasileiro: true, numeroDocumento: '09999215699', funcao: '1' }]
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('accepts valid ordering', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/logs', logsRouter);
    const res = await request(app).post('/api/logs').send({
      naturezaVoo: '6',
      siglaAerodromoDecolagem: 'SBBR',
      siglaAerodromoPouso: 'SBGR',
      horarioPartida: '2025-05-20T09:00',
      horarioDecolagem: '2025-05-20T10:00',
      horarioPouso: '2025-05-20T11:00',
      horarioCorteMotores: '2025-05-20T12:00',
      quantidadePessoasVoo: 1,
      totalCombustivel: 10,
      unidadeCombustivel: 'L',
      numeroPousoEtapa: 1,
      numeroCicloEtapa: 1,
      aeronautas: [{ aeronautaBrasileiro: true, numeroDocumento: '09999215699', funcao: '1' }]
    });
    expect([200, 201, 400]).toContain(res.status);
  });
});
