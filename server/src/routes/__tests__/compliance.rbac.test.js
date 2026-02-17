import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../../services/complianceService.js', () => ({
  listCompliance: vi.fn(async () => []),
  addCompliance: vi.fn(async (b) => ({ id: 'cmp1', ...b })),
  deleteCompliance: vi.fn(async () => true)
}));

vi.mock('../../services/auditService.js', () => ({ addAuditLog: vi.fn() }));

describe('RBAC Compliance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ROLES_ENFORCED = '1';
    process.env.ADMIN_API_KEY = '';
  });

  it('bloqueia POST /api/compliance sem role ADMINISTRADOR', async () => {
    const { router: complianceRouter } = await import('../compliance.js');
    const app = express();
    app.use(express.json());
    app.use('/api/compliance', complianceRouter);
    const res = await request(app).post('/api/compliance').send({
      type: 'AD',
      referenceNumber: 'AD-2025-001',
      description: 'Atualização',
      applicableTo: 'PRXXX',
      ata: '27',
      effectiveDate: '2025-01-01',
      status: 'PENDENTE'
    });
    expect(res.status).toBe(403);
  });

  it('permite POST /api/compliance com role ADMINISTRADOR', async () => {
    const { router: complianceRouter } = await import('../compliance.js');
    const app = express();
    app.use(express.json());
    app.use('/api/compliance', complianceRouter);
    const res = await request(app).post('/api/compliance').set('x-role', 'ADMINISTRADOR').send({
      type: 'AD',
      referenceNumber: 'AD-2025-001',
      description: 'Atualização',
      applicableTo: 'PRXXX',
      ata: '27',
      effectiveDate: '2025-01-01',
      status: 'PENDENTE'
    });
    expect(res.status).toBe(201);
  });
});
