import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { listAuditLogs, verifyAuditChain } from '../services/auditService.js';

export const router = Router();

router.get('/', async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'database unavailable' });
  }
  const schema = z.object({
    limit: z.string().optional(),
    offset: z.string().optional(),
    resource: z.string().optional(),
    action: z.string().optional(),
    resourceId: z.string().optional(),
    verify: z.string().optional()
  });
  const parsed = schema.safeParse(req.query || {});
  const q = parsed.success ? parsed.data : {};
  const limit = q.limit ? Math.min(Number(q.limit), 500) : 100;
  const offset = q.offset ? Number(q.offset) : 0;
  const resource = q.resource;
  const action = q.action;
  const resourceId = q.resourceId;
  const verify = q.verify === '1';
  const data = await listAuditLogs({ limit, offset, resource, action, resourceId, verify });
  res.json(data);
});

router.get('/verify', async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'database unavailable' });
  }
  const schema = z.object({
    resource: z.string().optional(),
    resourceId: z.string().optional()
  });
  const parsed = schema.safeParse(req.query || {});
  const q = parsed.success ? parsed.data : {};
  const resource = q.resource;
  const resourceId = q.resourceId;
  const data = await verifyAuditChain({ resource, resourceId });
  res.json(data);
});
