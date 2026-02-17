import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
process.env.ROLES_ENFORCED = '1';
process.env.ADMIN_API_KEY = '';
mongoose.connection.readyState = 1;
vi.mock('../../services/auditService.js', () => ({ addAuditLog: vi.fn() }));

vi.mock('../../models/aircraft.js', () => ({
  Aircraft: {
    findOne: vi.fn(async () => ({ id: 'a1', registration: 'PRXXX', save: vi.fn() }))
  }
}));

describe('RBAC Aircraft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bloqueia PUT /api/aircraft sem role OPERACOES', async () => {
    const { router: aircraftRouter } = await import('../aircraft.js');
    const app = express();
    app.use(express.json());
    app.use('/api/aircraft', aircraftRouter);
    const res = await request(app).put('/api/aircraft').send({ status: 'ATIVO' });
    expect(res.status).toBe(403);
  });

  it('permite PUT /api/aircraft com role OPERACOES', async () => {
    const { router: aircraftRouter } = await import('../aircraft.js');
    const app = express();
    app.use(express.json());
    app.use('/api/aircraft', aircraftRouter);
    const res = await request(app).put('/api/aircraft').set('x-role', 'OPERACOES').send({ status: 'ATIVO' });
    expect(res.status).toBe(200);
  });
});
