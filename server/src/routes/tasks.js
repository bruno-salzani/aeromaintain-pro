import { Router } from 'express';
import { listTasks, deleteTask } from '../services/taskService.js';
import { cacheGet, cacheSet } from '../utils/cache.js';
import { writeLimiter } from '../middleware/limits.js';
import { requireAdminApiKey } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

export const router = Router();

router.get('/', (req, res) => {
  cacheGet('tasks:list').then(cached => {
    if (cached) return res.json(JSON.parse(cached));
    listTasks().then(list => {
      cacheSet('tasks:list', JSON.stringify(list), 60);
      res.json(list);
    });
  });
});

router.delete('/:id', requireAdminApiKey, writeLimiter, requireRole(['ADMINISTRADOR']), (req, res) => {
  const id = req.params.id;
  deleteTask(id).then(ok => {
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  });
  cacheSet('tasks:list', JSON.stringify([]), 1);
});
