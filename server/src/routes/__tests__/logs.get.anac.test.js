import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../../services/anacService.js', () => ({
  queryFlightsOnAnac: vi.fn().mockResolvedValue([
    { tempoVooTotal: '58', siglaAerodromoDecolagem: 'SBBR', id: 2487, volumeID: 1111 }
  ])
}));

import { router as logsRouter } from '../logs.js';
import { queryFlightsOnAnac } from '../../services/anacService.js';

describe('GET /api/logs/anac', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('consulta por volumeID e retorna lista', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/logs', logsRouter);
    const res = await request(app).get('/api/logs/anac?volumeID=1111');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].volumeID).toBe(1111);
    expect(queryFlightsOnAnac).toHaveBeenCalledWith({ volumeID: '1111', etapaID: undefined });
  });

  it('consulta por etapaID e retorna item', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/logs', logsRouter);
    const res = await request(app).get('/api/logs/anac?etapaID=3456');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(queryFlightsOnAnac).toHaveBeenCalledWith({ volumeID: undefined, etapaID: '3456' });
  });
});
