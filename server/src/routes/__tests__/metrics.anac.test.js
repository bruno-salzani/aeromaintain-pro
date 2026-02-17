import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { router as metricsRouter } from '../metrics.js';
import { recordAnac } from '../../services/metricsService.js';

describe('GET /api/metrics/anac', () => {
  it('returns aggregated metrics', async () => {
    recordAnac('getAccessToken', true, 120);
    recordAnac('openVolume', false, 300);
    const app = express();
    app.use('/api/metrics', metricsRouter);
    const res = await request(app).get('/api/metrics/anac');
    expect(res.status).toBe(200);
    expect(res.body.getAccessToken.attempts).toBeGreaterThan(0);
    expect(res.body.openVolume.failures).toBeGreaterThan(0);
  });
});
