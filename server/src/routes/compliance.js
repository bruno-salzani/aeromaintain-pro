import { Router } from 'express';
import { listCompliance, addCompliance, deleteCompliance } from '../services/complianceService.js';
import { z } from 'zod';
import { writeLimiter } from '../infra/http/limits.js';
import { requireAdminApiKey } from '../infra/http/auth.js';
import { addAuditLog } from '../services/auditService.js';
import { requireRole } from '../infra/http/roles.js';

export const router = Router();

router.get('/', (req, res) => {
  listCompliance().then(list => res.json(list));
});

router.post('/', requireAdminApiKey, writeLimiter, requireRole(['ADMINISTRADOR']), (req, res, next) => {
  const schema = z.object({
    type: z.enum(['AD', 'DA', 'SB']),
    referenceNumber: z.string().min(1),
    description: z.string().min(1),
    applicableTo: z.string().min(1),
    ata: z.string().min(1),
    effectiveDate: z.string().min(1),
    status: z.enum(['CUMPRIDA', 'PENDENTE', 'REPETITIVA']),
    notes: z.string().optional()
  });
  const parsed = schema.safeParse(req.body || {});
  if (!parsed.success) return next(parsed.error);
  const body = parsed.data;
  addCompliance(body).then(item => {
    res.status(201).json(item);
    addAuditLog({ req, action: 'CREATE', resource: 'compliance', resourceId: item.id || item._id?.toString(), statusCode: 201, payload: body });
  });
});

router.delete('/:id', requireAdminApiKey, writeLimiter, requireRole(['ADMINISTRADOR']), (req, res) => {
  const id = req.params.id;
  deleteCompliance(id).then(ok => {
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
    addAuditLog({ req, action: 'DELETE', resource: 'compliance', resourceId: id, statusCode: 204 });
  });
});
