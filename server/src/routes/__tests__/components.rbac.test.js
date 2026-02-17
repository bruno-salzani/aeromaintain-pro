import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
process.env.ROLES_ENFORCED = '1';
process.env.ADMIN_API_KEY = '';

vi.mock('../../services/componentService.js', () => ({
  listComponents: vi.fn(async () => []),
  addComponent: vi.fn(async (b) => ({ id: 'c1', ...b })),
  updateComponent: vi.fn(async (id, b) => ({ id, ...b })),
  deleteComponent: vi.fn(async () => true)
}));

describe('RBAC Componentes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bloqueia POST /api/components sem role MANUTENCAO', async () => {
    const { router: componentsRouter } = await import('../components.js');
    const app = express();
    app.use(express.json());
    app.use('/api/components', componentsRouter);
    const res = await request(app).post('/api/components').send({
      pn: 'PN1', sn: 'SN1', description: 'Desc', installedDate: '2025-01-01'
    });
    expect(res.status).toBe(403);
  });

  it('permite POST /api/components com role MANUTENCAO', async () => {
    const { router: componentsRouter } = await import('../components.js');
    const app = express();
    app.use(express.json());
    app.use('/api/components', componentsRouter);
    const res = await request(app).post('/api/components').set('x-role', 'MANUTENCAO').send({
      pn: 'PN1', sn: 'SN1', description: 'Desc', installedDate: '2025-01-01'
    });
    expect(res.status).toBe(201);
  });
});
