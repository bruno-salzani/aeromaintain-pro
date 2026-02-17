import { Router } from 'express';
import { componentsController as ComponentsController } from '../main/controllers.js';
import { writeLimiter } from '../infra/http/limits.js';
import { requireRole } from '../infra/http/roles.js';
import { requireAdminApiKey } from '../infra/http/auth.js';
import { auditComponentChange } from '../middleware/auditComponents.js';

export const router = Router();

router.get('/', ComponentsController.list);

router.post('/', requireAdminApiKey, requireRole(['MANUTENCAO','ADMINISTRADOR']), writeLimiter, auditComponentChange('CREATE'), (req, res) => {
  ComponentsController.create(req, res);
});

router.patch('/:id', requireAdminApiKey, requireRole(['MANUTENCAO','ADMINISTRADOR']), writeLimiter, auditComponentChange('UPDATE'), (req, res) => {
  ComponentsController.update(req, res);
});

router.delete('/:id', requireAdminApiKey, requireRole(['MANUTENCAO','ADMINISTRADOR']), writeLimiter, auditComponentChange('DELETE'), (req, res) => {
  ComponentsController.delete(req, res);
});
