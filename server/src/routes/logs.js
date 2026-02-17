import { Router } from 'express';
import { logsController as LogsController } from '../main/controllers.js';
import { writeLimiter } from '../infra/http/limits.js';
import { requireRole } from '../infra/http/roles.js';
import { requireScope } from '../middleware/roles.js';
import { requireAdminApiKey } from '../infra/http/auth.js';

export const router = Router();

 

router.get('/', (req, res) => LogsController.list(req, res));

router.post('/', requireAdminApiKey, writeLimiter, requireRole(['TRIPULACAO','OPERACOES','ADMINISTRADOR']), (req, res) => LogsController.create(req, res));

router.delete('/:id', requireAdminApiKey, writeLimiter, (req, res) => LogsController.delete(req, res));

router.post('/:id/retificar', requireAdminApiKey, writeLimiter, requireScope('logs','RECTIFY'), (req, res) => LogsController.retificar(req, res));

router.put('/:id', requireAdminApiKey, writeLimiter, requireRole(['OPERACOES','ADMINISTRADOR']), (req, res) => LogsController.updateEtapa(req, res));

router.put('/:id/assinar-operador', requireAdminApiKey, writeLimiter, requireRole(['OPERACOES','ADMINISTRADOR']), (req, res) => LogsController.signOperator(req, res));

router.delete('/:id/anac', requireAdminApiKey, writeLimiter, (req, res) => LogsController.deleteAnac(req, res));

router.get('/anac', (req, res) => LogsController.queryAnac(req, res));
