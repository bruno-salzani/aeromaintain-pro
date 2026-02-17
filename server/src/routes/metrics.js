import { Router } from 'express';
import { getAnacMetrics, getAuditMetrics } from '../services/metricsService.js';

export const router = Router();

router.get('/anac', (req, res) => {
  res.json(getAnacMetrics());
});

router.get('/audit', (req, res) => {
  res.json(getAuditMetrics());
});
