import { Router } from 'express';
import mongoose from 'mongoose';
import { Aircraft } from '../models/aircraft.js';
import { cacheGet, cacheSet } from '../utils/cache.js';
import { z } from 'zod';
import { addAuditLog } from '../services/auditService.js';
import { writeLimiter } from '../infra/http/limits.js';
import { requireRole } from '../infra/http/roles.js';
import { requireAdminApiKey } from '../infra/http/auth.js';

export const router = Router();

router.get('/', (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'database unavailable' });
  }
  cacheGet('aircraft:one').then(cached => {
    if (cached) return res.json(JSON.parse(cached));
    Aircraft.findOne().then(doc => {
      if (doc) cacheSet('aircraft:one', JSON.stringify(doc), 60);
      res.json(doc);
    });
  });
});

router.post('/', requireAdminApiKey, writeLimiter, requireRole(['OPERACOES','ADMINISTRADOR']), (req, res, next) => {
  const schema = z.object({
    registration: z.string().min(1),
    msn: z.string().optional(),
    model: z.string().min(1),
    manufactureYear: z.number().optional(),
    totalHours: z.number().optional(),
    totalCycles: z.number().optional(),
    nextIAMDate: z.string().optional(),
    validityCA: z.string().optional(),
    status: z.enum(['ATIVO', 'PARADO', 'MANUTENCAO']).optional()
  });
  const parsed = schema.safeParse(req.body || {});
  if (!parsed.success) return next(parsed.error);
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'database unavailable' });
  }
  const body = parsed.data;
  Aircraft.create(body).then(doc => {
    cacheSet('aircraft:one', JSON.stringify(doc), 60);
    res.status(201).json(doc);
    addAuditLog({ req, action: 'CREATE', resource: 'aircraft', resourceId: doc.id || doc._id?.toString(), statusCode: 201, payload: body });
  }).catch(e => res.status(400).json({ error: 'create failed' }));
});

router.put('/', requireAdminApiKey, writeLimiter, requireRole(['OPERACOES','ADMINISTRADOR']), (req, res) => {
  const body = req.body || {};
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'database unavailable' });
  }
  Aircraft.findOne().then(async doc => {
    if (!doc) return res.status(500).json({ error: 'Aircraft not initialized' });
    Object.assign(doc, body);
    await doc.save();
    res.json(doc);
    addAuditLog({ req, action: 'UPDATE', resource: 'aircraft', resourceId: doc.id || doc._id?.toString(), statusCode: 200, payload: body });
  });
  cacheSet('aircraft:one', JSON.stringify([]), 1);
});
