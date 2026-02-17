import { Router } from 'express';
import { cacheGet, cacheSet } from '../utils/cache.js';
import { z } from 'zod';
import { writeLimiter } from '../infra/http/limits.js';
import { requireRole } from '../infra/http/roles.js';
import { requireAdminApiKey } from '../infra/http/auth.js';
import { VolumesController } from '../adapters/controllers/VolumesController.js';

export const router = Router();

router.get('/', VolumesController.list);

router.post('/open', requireAdminApiKey, requireRole(['OPERACOES','ADMINISTRADOR']), (req, res) => VolumesController.open(req, res));

router.post('/:id/close', requireAdminApiKey, requireRole(['OPERACOES','ADMINISTRADOR']), writeLimiter, (req, res) => {
  const p = z.object({ observacoes: z.string().min(5) }).safeParse(req.body || {});
  if (!p.success) return res.status(400).json({ error: 'observacoes required' });
  req.body = { observacoes: p.data.observacoes };
  VolumesController.close(req, res);
});

router.put('/:id/close', requireAdminApiKey, requireRole(['OPERACOES','ADMINISTRADOR']), writeLimiter, async (req, res) => {
  const id = req.params.id;
  const hourPattern = z.string().regex(/^\d{1,6}:\d{2}$/);
  const cyclePattern = z.string().regex(/^\d+$/);
  const datePattern = z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/);
  const schema = z.object({
    dataFechamentoVolume: datePattern,
    minutosTotaisVoo: z.number().min(0),
    totalPousos: z.number().min(0),
    totalCiclosCelula: z.number().min(0),
    observacoesTermoDeFechamento: z.string().optional(),
    horasVooMotor: z.record(hourPattern).optional(),
    ciclosMotor: z.record(cyclePattern).optional()
  });
  const parsed = schema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'invalid close payload' });
  req.body = parsed.data;
  VolumesController.closePut(req, res);
});

router.get('/:id/anac', requireAdminApiKey, VolumesController.getAnac);

router.get('/anac', requireAdminApiKey, VolumesController.queryAnac);
router.post('/close-active', requireAdminApiKey, requireRole(['OPERACOES','ADMINISTRADOR']), writeLimiter, VolumesController.closeActive);

router.put('/:id', requireAdminApiKey, requireRole(['OPERACOES','ADMINISTRADOR']), writeLimiter, async (req, res) => {
  const id = req.params.id;
  const schema = z.object({
    numeroVolume: z.string().min(1),
    minutosTotaisVoo: z.number().min(0),
    totalPousos: z.number().min(0),
    totalCiclosCelula: z.number().min(0),
    observacoesTermoDeAbertura: z.string().optional(),
    horasVooMotor: z.record(z.string()).optional(),
    ciclosMotor: z.record(z.string()).optional()
  });
  const parsed = schema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'invalid volume update' });
  req.body = parsed.data;
  VolumesController.update(req, res);
});
