import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { recordAuditCheck } from '../../services/metricsService.js';

describe('metrics.audit endpoint', () => {
  it('retorna estrutura de métricas de auditoria com contadores', async () => {
    const { router: metricsRouter } = await import('../metrics.js');
    const app = express();
    app.use('/api/metrics', metricsRouter);
    recordAuditCheck('logs', true, 10, undefined, 2);
    recordAuditCheck('components', false, 5, 3, 1);
    const res = await request(app).get('/api/metrics/audit');
    expect(res.status).toBe(200);
    expect(res.body.byResource.logs.lastRectifyCount).toBe(2);
    expect(res.body.byResource.components.failures).toBeGreaterThan(0);
    expect(res.body.totalFailures).toBeGreaterThan(0);
  });
});
