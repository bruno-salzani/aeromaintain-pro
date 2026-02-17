import { z } from 'zod';
import { cacheGet, cacheSet } from '../../utils/cache.js';
import { listComponents, addComponent, updateComponent, deleteComponent } from '../../services/componentService.js';

export const ComponentsController = {
  list: async (req, res) => {
    const cached = await cacheGet('components:list');
    if (cached) return res.json(JSON.parse(cached));
    const list = await listComponents();
    await cacheSet('components:list', JSON.stringify(list), 60);
    res.json(list);
  },
  create: async (req, res) => {
    const schema = z.object({
      pn: z.string().min(1),
      sn: z.string().min(1),
      description: z.string().min(1),
      installedDate: z.string().min(1),
      installedHours: z.number().optional(),
      installedCycles: z.number().optional(),
      lifeLimitHours: z.number().optional(),
      lifeLimitCycles: z.number().optional(),
      calendarLimitDays: z.number().optional(),
      status: z.string().optional(),
      ata: z.string().optional()
    });
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: 'invalid component' });
    const body = parsed.data;
    const comp = await addComponent(body);
    res.status(201).json(comp);
    await cacheSet('components:list', JSON.stringify([]), 1);
  },
  update: async (req, res) => {
    const id = req.params.id;
    const schema = z.object({
      pn: z.string().optional(),
      sn: z.string().optional(),
      description: z.string().optional(),
      installedDate: z.string().optional(),
      installedHours: z.number().optional(),
      installedCycles: z.number().optional(),
      lifeLimitHours: z.number().optional(),
      lifeLimitCycles: z.number().optional(),
      calendarLimitDays: z.number().optional(),
      remainingHours: z.number().optional(),
      remainingDays: z.number().optional(),
      status: z.string().optional(),
      ata: z.string().optional()
    });
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: 'invalid payload' });
    const body = parsed.data;
    const updated = await updateComponent(id, body);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
    await cacheSet('components:list', JSON.stringify([]), 1);
  },
  delete: async (req, res) => {
    const id = req.params.id;
    const ok = await deleteComponent(id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
    await cacheSet('components:list', JSON.stringify([]), 1);
  }
};
