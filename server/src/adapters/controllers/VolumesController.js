import { listVolumes, openVolume, closeVolume, updateVolume } from '../../services/volumeService.js';
import { openVolumeOnAnac, closeVolumeOnAnac, updateVolumeOnAnac, closeVolumePutOnAnac, fetchVolumeOnAnac, queryVolumesOnAnac } from '../../services/anacService.js';
import { cacheGet, cacheSet } from '../../utils/cache.js';
import { addAuditLog } from '../../services/auditService.js';
import { openVolumeUC } from '../../core/usecases/openVolume.js';
import { closeVolumeUC } from '../../core/usecases/closeVolume.js';
import { updateVolumeUC } from '../../core/usecases/updateVolume.js';
import { Aircraft } from '../../models/aircraft.js';
import { Component } from '../../models/component.js';
import { z } from 'zod';

export const VolumesController = {
  list: async (req, res) => {
    const cached = await cacheGet('volumes:list');
    if (cached) return res.json(JSON.parse(cached));
    const list = await listVolumes();
    await cacheSet('volumes:list', JSON.stringify(list), 60);
    res.json(list);
  },
  open: async (req, res) => {
    try {
      const enforced = process.env.ROLES_ENFORCED === '1';
      if (enforced) {
        const role = (req.headers['x-role'] || '').toString().toUpperCase();
        const adminKey = process.env.ADMIN_API_KEY || '';
        const providedKey = req.headers['x-api-key'] || '';
        const allowed = new Set(['OPERACOES', 'ADMINISTRADOR']);
        if (!(adminKey && providedKey === adminKey) && !allowed.has(role)) {
          return res.status(403).json({ error: 'forbidden: role required', required: Array.from(allowed) });
        }
      }
      const hourPattern = z.string().regex(/^\d{1,6}:\d{2}$/);
      const cyclePattern = z.string().regex(/^\d+$/);
      const schema = z.object({
        numeroVolume: z.string().min(1),
        matriculaAeronave: z.string().min(1),
        dataAbertura: z.string().optional(),
        minutosTotaisVooInicio: z.number(),
        totalPousosInicio: z.number(),
        totalCiclosCelulaInicio: z.number(),
        observacoesAbertura: z.string().optional(),
        horasVooMotor: z.record(hourPattern).optional(),
        ciclosMotor: z.record(cyclePattern).optional(),
        autoClose: z.boolean().optional()
      });
      const parsed = schema.safeParse(req.body || {});
      if (!parsed.success) return res.status(400).json({ error: 'invalid volume' });
      const body = parsed.data;
      const svc = await import('../../services/volumeService.js');
      const anac = await import('../../services/anacService.js');
      const list = await svc.listVolumes();
      const arr = Array.isArray(list) ? list : [];
      const active = arr.find(v => v.status === 'ABERTO');
      if (active && body.autoClose) {
        if (typeof svc.closeVolume === 'function') {
          await svc.closeVolume(active.id || active._id?.toString(), 'Encerrado automaticamente para abertura de novo volume');
        }
        if (active.anacVolumeId && typeof anac.closeVolumeOnAnac === 'function') await anac.closeVolumeOnAnac(active.anacVolumeId);
      } else if (active && !body.autoClose) {
        return res.status(409).json({ error: 'volume aberto' });
      }
      const { volId, opIds } = await anac.openVolumeOnAnac({
        numeroVolume: body.numeroVolume,
        matriculaAeronave: body.matriculaAeronave,
        dataAbertura: body.dataAbertura,
        minutosTotaisVoo: body.minutosTotaisVooInicio,
        totalPousos: body.totalPousosInicio,
        totalCiclosCelula: body.totalCiclosCelulaInicio,
        observacoesTermoDeAbertura: body.observacoesAbertura,
        horasVooMotor: body.horasVooMotor,
        ciclosMotor: body.ciclosMotor
      });
      const vol = await svc.openVolume({ ...body, anacVolumeId: volId, anacOperatorIds: opIds });
      res.status(201).json(vol);
      addAuditLog({ req, action: 'OPEN', resource: 'volumes', resourceId: vol.id || vol._id?.toString(), statusCode: 201, payload: req.body });
      await cacheSet('volumes:list', JSON.stringify([]), 1);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  },
  close: async (req, res) => {
    try {
      const id = req.params.id;
      const observacoes = req.body.observacoes;
      const aircraft = await Aircraft.findOne();
      const vencidos = await Component.countDocuments({ status: 'VENCIDO' });
      const criticos = await Component.countDocuments({ status: 'CRITICO' });
      if (!aircraft) return res.status(500).json({ error: 'Aircraft not initialized' });
      if (vencidos > 0) return res.status(422).json({ error: 'componentes vencidos', count: vencidos });
      const updated = await closeVolume(id, observacoes);
      if (!updated) return res.status(404).json({ error: 'Not found' });
      const meta = { observacoes, criticos };
      res.json({ ...updated, meta });
      addAuditLog({ req, action: 'CLOSE', resource: 'volumes', resourceId: id, statusCode: 200, payload: meta });
      if (updated.anacVolumeId) closeVolumeOnAnac(updated.anacVolumeId);
      await cacheSet('volumes:list', JSON.stringify([]), 1);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  },
  closePut: async (req, res) => {
    try {
      const id = req.params.id;
      const body = req.body;
      const { updated, anacResponse } = await closeVolumeUC(id, body, {
        volumeService: { listVolumes, closeVolume },
        anacService: { closeVolumePutOnAnac },
        operatorId: req.headers['aircompany']
      });
      res.json({ ...updated, anac: anacResponse });
      addAuditLog({ req, action: 'CLOSE', resource: 'volumes', resourceId: id, statusCode: 200, payload: body });
      await cacheSet('volumes:list', JSON.stringify([]), 1);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  },
  getAnac: async (req, res) => {
    try {
      const id = req.params.id;
      const vols = await listVolumes();
      const vol = vols.find(v => (v.id || v._id?.toString()) === id);
      if (!vol) return res.status(404).json({ error: 'Not found' });
      const operatorIdHeader = req.headers['aircompany'];
      const operatorId = typeof operatorIdHeader === 'string' ? operatorIdHeader : (Array.isArray(vol.anacOperatorIds) ? vol.anacOperatorIds[0] : '');
      if (!operatorId) return res.status(400).json({ error: 'operator id required' });
      if (!vol.anacVolumeId) return res.status(400).json({ error: 'no anac volume id' });
      const data = await fetchVolumeOnAnac(vol.anacVolumeId, operatorId);
      res.json(data);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  },
  queryAnac: async (req, res) => {
    try {
      const nrMatricula = typeof req.query.nrMatricula === 'string' ? req.query.nrMatricula : '';
      const volumeId = typeof req.query.volumeId === 'string' ? req.query.volumeId : '';
      const nrVolume = typeof req.query.nrVolume === 'string' ? req.query.nrVolume : '';
      if (!nrMatricula && !volumeId && !nrVolume) return res.status(400).json({ error: 'nrMatricula, volumeId ou nrVolume requerido' });
      const list = await queryVolumesOnAnac({ nrMatricula, volumeId, nrVolume });
      res.json(list);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  },
  closeActive: async (req, res) => {
    const list = await listVolumes();
    const active = list.find(v => v.status === 'ABERTO');
    if (!active) return res.status(404).json({ error: 'No active volume' });
    const updated = await closeVolume(active.id || active._id?.toString(), 'Encerrado pelo gestor');
    if (updated && updated.anacVolumeId) closeVolumeOnAnac(updated.anacVolumeId);
    res.json(updated);
    addAuditLog({ req, action: 'CLOSE', resource: 'volumes', resourceId: updated.id || updated._id?.toString(), statusCode: 200 });
    await cacheSet('volumes:list', JSON.stringify([]), 1);
  },
  update: async (req, res) => {
    try {
      const id = req.params.id;
      const body = req.body;
      const updated = await updateVolumeUC(id, body, {
        volumeService: { listVolumes, updateVolume },
        anacService: { updateVolumeOnAnac },
        operatorId: req.headers['aircompany']
      });
      res.json(updated);
      addAuditLog({ req, action: 'UPDATE', resource: 'volumes', resourceId: id, statusCode: 200, payload: body });
      await cacheSet('volumes:list', JSON.stringify([]), 1);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  }
};
