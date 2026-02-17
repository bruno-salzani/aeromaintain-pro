import { z } from 'zod';
import { listLogs, deleteLog } from '../../services/logService.js';
import { addAuditLog } from '../../services/auditService.js';
import { Log } from '../../models/log.js';
import { Volume } from '../../models/volume.js';
import { Aircraft } from '../../models/aircraft.js';
import { updateFlightOnAnac, signOperatorOnAnac, deleteFlightOnAnac, queryFlightsOnAnac, updateVolumeOnAnac } from '../../services/anacService.js';
import { registerFlight } from '../../core/usecases/registerFlight.js';
import { updateMaintenanceByFlightStage } from '../../core/usecases/updateMaintenanceByFlightStage.js';
import { FlightLogRepository } from '../../infra/repositories/FlightLogRepository.js';
import { VolumeRepository } from '../../infra/repositories/VolumeRepository.js';
import { AircraftRepository } from '../../infra/repositories/AircraftRepository.js';
import { ComponentRepository } from '../../infra/repositories/ComponentRepository.js';
import { ComponentSnapshotRepository } from '../../infra/repositories/ComponentSnapshotRepository.js';
import { CivClassifier } from '../../infra/services/CivClassifier.js';
import { AnacGateway } from '../../infra/gateways/AnacGateway.js';

export const LogsController = {
  list: async (req, res) => {
    const list = await listLogs();
    res.json(list);
  },
  create: async (req, res) => {
    const schema = z.object({
      volumeId: z.string().min(1),
      naturezaVoo: z.enum(['1','2','4','5','6','7','8','10']),
      siglaAerodromoDecolagem: z.string().optional(),
      latitudeDecolagem: z.string().optional(),
      longitudeDecolagem: z.string().optional(),
      localDecolagem: z.string().optional(),
      siglaAerodromoPouso: z.string().optional(),
      latitudePouso: z.string().optional(),
      longitudePouso: z.string().optional(),
      localPouso: z.string().optional(),
      horarioPartida: z.string().min(1),
      horarioDecolagem: z.string().optional(),
      horarioPouso: z.string().optional(),
      horarioCorteMotores: z.string().min(1),
      tempoVooTotal: z.string().min(1),
      tempoVooDiurno: z.string().optional(),
      tempoVooNoturno: z.string().optional(),
      tempoVooIFR: z.string().optional(),
      tempoVooIFRC: z.string().optional(),
      quantidadePessoasVoo: z.number(),
      cargaTransportada: z.union([z.string(), z.number()]).optional(),
      unidadeCargaTransportada: z.string().optional(),
      totalCombustivel: z.union([z.string(), z.number()]),
      unidadeCombustivel: z.string(),
      milhasNavegacao: z.string().optional(),
      minutosNavegacao: z.string().optional(),
      numeroPousoEtapa: z.number(),
      numeroCicloEtapa: z.number(),
      aeronautas: z.array(z.object({
        aeronautaBrasileiro: z.boolean(),
        numeroDocumento: z.string().min(3),
        nome: z.string().optional(),
        nomeTripulanteEstrangeiro: z.string().optional(),
        emailTripulanteEstrangeiro: z.string().optional(),
        funcao: z.enum(['1','2','3','7','8','9','11','12']),
        horarioApresentacao: z.string().optional(),
        siglaIcaoBaseContratual: z.string().optional(),
        descricaoBaseContratual: z.string().optional()
      })).min(1),
      ocorrencia: z.array(z.object({
        ocorrencia: z.string().min(1),
        datahoraOcorrencia: z.string().min(1),
        localOcorrencia: z.string().optional(),
        codigoClassificacaoOcorrencia: z.union([z.string(), z.number()]).optional(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        qualificacaoCivilRefs: z.array(z.object({
          funcao: z.enum(['1','2','3','7','8','9','11','12'])
        })).optional()
      })).optional()
    }).superRefine((val, ctx) => {
      const originIdentified = !!(val.siglaAerodromoDecolagem && val.siglaAerodromoDecolagem.trim().length)
        || (!!val.latitudeDecolagem && !!val.longitudeDecolagem)
        || (!!val.localDecolagem && val.localDecolagem.trim().length);
      if (!originIdentified) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['siglaAerodromoDecolagem'], message: 'origem requer ICAO ou (lat+long) ou local' });
      }
      const destIdentified = !!(val.siglaAerodromoPouso && val.siglaAerodromoPouso.trim().length)
        || (!!val.latitudePouso && !!val.longitudePouso)
        || (!!val.localPouso && val.localPouso.trim().length);
      if (!destIdentified && (val.numeroPousoEtapa > 0)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['siglaAerodromoPouso'], message: 'destino requer ICAO ou (lat+long) ou local quando há pouso' });
      }
      if (val.numeroPousoEtapa > 0) {
        if (!val.horarioDecolagem) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['horarioDecolagem'], message: 'horarioDecolagem obrigatório quando há pouso' });
        }
        if (!val.horarioPouso) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['horarioPouso'], message: 'horarioPouso obrigatório quando há pouso' });
        }
      }
      const toDate = (s) => s ? new Date(s) : null;
      const partida = toDate(val.horarioPartida);
      const decolagem = toDate(val.horarioDecolagem);
      const pouso = toDate(val.horarioPouso);
      const corte = toDate(val.horarioCorteMotores);
      if (partida && decolagem && partida.getTime() > decolagem.getTime()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['horarioPartida'], message: 'Partida deve ser anterior ou igual à Decolagem' });
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['horarioDecolagem'], message: 'Decolagem deve ser posterior ou igual à Partida' });
      }
      if (decolagem && pouso && decolagem.getTime() > pouso.getTime()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['horarioDecolagem'], message: 'Decolagem deve ser anterior ou igual ao Pouso' });
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['horarioPouso'], message: 'Pouso deve ser posterior ou igual à Decolagem' });
      }
      if (pouso && corte && pouso.getTime() > corte.getTime()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['horarioPouso'], message: 'Pouso deve ser anterior ou igual ao Corte' });
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['horarioCorteMotores'], message: 'Corte deve ser posterior ou igual ao Pouso' });
      }
      if (!pouso && partida && corte && partida.getTime() > corte.getTime()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['horarioPartida'], message: 'Partida deve ser anterior ou igual ao Corte' });
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['horarioCorteMotores'], message: 'Corte deve ser posterior ou igual à Partida' });
      }
    });
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: 'invalid log' });
    const body = parsed.data;
    if (process.env.ROLES_ENFORCED === '1') {
      try {
        const { Component } = await import('../../models/component.js');
        const vencidos = await Component.countDocuments({ status: 'VENCIDO' });
        const role = (req.headers['x-role'] || '').toString().toUpperCase();
        if (vencidos > 0 && role !== 'MANUTENCAO') {
          return res.status(422).json({ error: 'bloqueio de voo por manutenção vencida', count: vencidos });
        }
      } catch {}
    }
    const hasPilot = body.aeronautas.some(a => ['1','2','3','7','8'].includes(a.funcao));
    if (!hasPilot) return res.status(422).json({ error: 'tripulação sem piloto' });
    if (body.naturezaVoo === '8') {
      const hasInstrutor = body.aeronautas.some(a => a.funcao === '8');
      const hasAluno = body.aeronautas.some(a => a.funcao === '3' || a.funcao === '9');
      if (!hasInstrutor || !hasAluno) return res.status(422).json({ error: 'treinamento requer instrutor (V1) e aluno (I1)' });
    }
    try {
      const deps = {
        flightLogRepo: new FlightLogRepository(),
        volumeRepo: new VolumeRepository(),
        aircraftRepo: new AircraftRepository(),
        componentRepo: new ComponentRepository(),
        componentSnapshotRepo: new ComponentSnapshotRepository(),
        civClassifier: new CivClassifier(),
        anacGateway: new AnacGateway(),
        updateMaintenanceByFlightStage
      };
      const log = await registerFlight(body, deps);
      res.status(201).json(log);
      addAuditLog({ req, action: 'CREATE', resource: 'logs', resourceId: log.id || log._id?.toString(), statusCode: 201, payload: body });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  },
  delete: async (req, res) => {
    const id = req.params.id;
    try {
      const ok = await deleteLog(id);
      if (!ok) return res.status(404).json({ error: 'Not found' });
      res.status(204).end();
      addAuditLog({ req, action: 'DELETE', resource: 'logs', resourceId: id, statusCode: 204 });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  },
  retificar: async (req, res) => {
    const id = req.params.id;
    const schema = z.object({
      field: z.enum(['naturezaVoo','siglaAerodromoDecolagem','siglaAerodromoPouso','horarioPartida','horarioDecolagem','horarioPouso','horarioCorteMotores','tempoVooTotal','numeroPousoEtapa','numeroCicloEtapa']),
      newValue: z.union([z.string(), z.number()]),
      justification: z.string().min(10),
      operatorId: z.string().min(3)
    });
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: 'invalid termo' });
    const body = parsed.data;
    if (process.env.RECTIFY_DUAL_APPROVAL === '1') {
      const approver = typeof req.headers['x-approver'] === 'string' ? req.headers['x-approver'] : '';
      const approverRole = (req.headers['x-approver-role'] || '').toString().toUpperCase();
      if (!approver || !['OPERACOES','ADMINISTRADOR'].includes(approverRole)) {
        return res.status(403).json({ error: 'segunda aprovação requerida por OPERACOES/ADMINISTRADOR' });
      }
    }
    const doc = await Log.findById(id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    const oldValue = doc[body.field];
    const correction = {
      field: body.field,
      oldValue,
      newValue: body.newValue,
      justification: body.justification,
      operatorId: body.operatorId,
      timestamp: new Date().toISOString()
    };
    doc.corrections = doc.corrections || [];
    doc.corrections.push(correction);
    await doc.save();
    res.status(201).json({ id, correction });
    addAuditLog({
      req,
      action: 'RECTIFY',
      resource: 'logs',
      resourceId: id,
      statusCode: 201,
      payload: correction,
      justification: body.justification,
      changes: [{ field: body.field, oldValue, newValue: body.newValue }]
    });
  },
  updateEtapa: async (req, res) => {
    const id = req.params.id;
    const schema = z.object({
      naturezaVoo: z.enum(['1','2','4','5','6','7','8','10']),
      siglaAerodromoDecolagem: z.string().optional(),
      latitudeDecolagem: z.string().optional(),
      longitudeDecolagem: z.string().optional(),
      localDecolagem: z.string().optional(),
      siglaAerodromoPouso: z.string().optional(),
      latitudePouso: z.string().optional(),
      longitudePouso: z.string().optional(),
      localPouso: z.string().optional(),
      horarioPartida: z.string().min(1),
      horarioDecolagem: z.string().optional(),
      horarioPouso: z.string().optional(),
      horarioCorteMotores: z.string().min(1),
      tempoVooTotal: z.string().min(1),
      tempoVooDiurno: z.string().optional(),
      tempoVooNoturno: z.string().optional(),
      tempoVooIFR: z.string().optional(),
      tempoVooIFRC: z.string().optional(),
      quantidadePessoasVoo: z.number(),
      cargaTransportada: z.union([z.string(), z.number()]).optional(),
      unidadeCargaTransportada: z.string().optional(),
      totalCombustivel: z.union([z.string(), z.number()]),
      unidadeCombustivel: z.string(),
      milhasNavegacao: z.string().optional(),
      minutosNavegacao: z.string().optional(),
      numeroPousoEtapa: z.number(),
      numeroCicloEtapa: z.number(),
      aeronautas: z.array(z.object({
        aeronautaBrasileiro: z.boolean(),
        numeroDocumento: z.string().min(3),
        nome: z.string().optional(),
        nomeTripulanteEstrangeiro: z.string().optional(),
        emailTripulanteEstrangeiro: z.string().optional(),
        funcao: z.enum(['1','2','3','7','8','9','11','12']),
        horarioApresentacao: z.string().optional(),
        siglaIcaoBaseContratual: z.string().optional(),
        descricaoBaseContratual: z.string().optional()
      })).min(1),
      ocorrencia: z.array(z.object({
        ocorrencia: z.string().min(1),
        datahoraOcorrencia: z.string().min(1),
        localOcorrencia: z.string().optional(),
        codigoClassificacaoOcorrencia: z.union([z.string(), z.number()]).optional(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        qualificacaoCivilRefs: z.array(z.object({
          funcao: z.enum(['1','2','3','7','8','9','11','12'])
        })).optional()
      })).optional(),
      justification: z.string().min(10).optional()
    }).superRefine((val, ctx) => {
      const originIdentified = !!(val.siglaAerodromoDecolagem && val.siglaAerodromoDecolagem.trim().length)
        || (!!val.latitudeDecolagem && !!val.longitudeDecolagem)
        || (!!val.localDecolagem && val.localDecolagem.trim().length);
      if (!originIdentified) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['siglaAerodromoDecolagem'], message: 'origem requer ICAO ou (lat+long) ou local' });
      }
      const destIdentified = !!(val.siglaAerodromoPouso && val.siglaAerodromoPouso.trim().length)
        || (!!val.latitudePouso && !!val.longitudePouso)
        || (!!val.localPouso && val.localPouso.trim().length);
      if (!destIdentified && (val.numeroPousoEtapa > 0)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['siglaAerodromoPouso'], message: 'destino requer ICAO ou (lat+long) ou local quando há pouso' });
      }
    });
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: 'invalid payload' });
    const body = parsed.data;
    const doc = await Log.findById(id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    const role = (req.headers['x-role'] || '').toString().toUpperCase();
    const operatorIdHeader = req.headers['aircompany'];
    const operatorId = typeof operatorIdHeader === 'string' ? operatorIdHeader : '';
    if (!operatorId) return res.status(400).json({ error: 'operator id required' });
    if (doc.anacOperatorId && operatorId !== doc.anacOperatorId) return res.status(403).json({ error: 'operador diferente do criador da etapa' });
    const vol = await Volume.findById(doc.volumeId).lean();
    if (vol && vol.status === 'FECHADO' && vol.dataFechamento) {
      const closeDate = new Date(vol.dataFechamento);
      const ninetyDays = 90 * 24 * 60 * 60 * 1000;
      if (Date.now() - closeDate.getTime() > ninetyDays) {
        return res.status(400).json({ error: 'volume fechado há mais de 90 dias' });
      }
    }
    const startIso = body.horarioDecolagem || body.horarioPartida;
    const endIso = body.horarioPouso || body.horarioCorteMotores;
    const dep = new Date(startIso);
    const arr = new Date(endIso);
    const diffMs = arr.getTime() - dep.getTime();
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor((diffMs % 3600000) / 60000);
    const tempoVooTotal = `${String(diffHrs).padStart(2, '0')}:${String(diffMins).padStart(2, '0')}`;
    const blockTimeHours = diffMs / 3600000;
    const anacPayload = {
      naturezaVoo: body.naturezaVoo,
      siglaAerodromoDecolagem: body.siglaAerodromoDecolagem,
      latitudeDecolagem: body.latitudeDecolagem || undefined,
      longitudeDecolagem: body.longitudeDecolagem || undefined,
      localDecolagem: body.localDecolagem || undefined,
      siglaAerodromoPouso: body.siglaAerodromoPouso,
      latitudePouso: body.latitudePouso || undefined,
      longitudePouso: body.longitudePouso || undefined,
      localPouso: body.localPouso || undefined,
      tempoVooTotal,
      tempoVooDiurno: body.tempoVooDiurno || undefined,
      tempoVooNoturno: body.tempoVooNoturno || undefined,
      tempoVooIFR: body.tempoVooIFR || undefined,
      tempoVooIFRC: body.tempoVooIFRC || undefined,
      horarioPartida: body.horarioPartida,
      horarioDecolagem: body.horarioDecolagem,
      horarioPouso: body.horarioPouso,
      horarioCorteMotores: body.horarioCorteMotores,
      quantidadePessoasVoo: body.quantidadePessoasVoo,
      cargaTransportada: body.cargaTransportada || undefined,
      unidadeCargaTransportada: body.unidadeCargaTransportada || undefined,
      totalCombustivel: body.totalCombustivel,
      unidadeCombustivel: body.unidadeCombustivel,
      numeroPousoEtapa: body.numeroPousoEtapa,
      numeroCicloEtapa: body.numeroCicloEtapa,
      milhasNavegacao: body.milhasNavegacao || undefined,
      minutosNavegacao: body.minutosNavegacao || undefined,
      aeronautas: body.aeronautas || [],
      ocorrencia: body.ocorrencia || undefined,
      dataHorarioAssinaturaPiloto: undefined,
      dataHorarioAssinaturaOperador: undefined
    };
    try {
      const newId = await updateFlightOnAnac(doc.anacEtapaId, operatorId, anacPayload);
      doc.deleted = true;
      await doc.save();
      const newDoc = await Log.create({
        ...body,
        volumeId: doc.volumeId,
        tempoVooTotal,
        isLocked: true,
        hashIntegridade: (doc.hashIntegridade || ''),
        blockTimeHours,
        anacEtapaId: newId || doc.anacEtapaId,
        anacOperatorId: operatorId
      });
      const aircraft = await Aircraft.findOne();
      if (aircraft) {
        const old = doc.blockTimeHours || 0;
        aircraft.totalHours = (aircraft.totalHours || 0) - old + blockTimeHours;
        aircraft.totalCycles = (aircraft.totalCycles || 0) - (doc.numeroCicloEtapa || 0) + (body.numeroCicloEtapa || 0);
        await aircraft.save();
      }
      res.json(newDoc);
      const canRectify = !!body.justification && ['OPERACOES','ADMINISTRADOR'].includes(role);
      const fields = ['naturezaVoo','siglaAerodromoDecolagem','siglaAerodromoPouso','horarioPartida','horarioDecolagem','horarioPouso','horarioCorteMotores','tempoVooTotal','numeroPousoEtapa','numeroCicloEtapa','quantidadePessoasVoo','cargaTransportada','unidadeCargaTransportada','totalCombustivel','unidadeCombustivel','milhasNavegacao','minutosNavegacao'];
      const changes = [];
      for (const k of fields) {
        const o = doc[k];
        const n = (k === 'tempoVooTotal' ? tempoVooTotal : body[k]);
        if (JSON.stringify(o) !== JSON.stringify(n)) {
          changes.push({ field: k, oldValue: o, newValue: n });
        }
      }
      addAuditLog({
        req,
        action: canRectify ? 'RECTIFY' : 'UPDATE',
        resource: 'logs',
        resourceId: id,
        statusCode: 200,
        payload: body,
        justification: canRectify ? body.justification : undefined,
        changes
      });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  },
  signOperator: async (req, res) => {
    const id = req.params.id;
    const schema = z.object({
      dataHorarioAssinaturaOperador: z.string().min(1)
    });
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: 'invalid payload' });
    const body = parsed.data;
    const doc = await Log.findById(id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    const cpf = typeof req.headers['x-user-cpf'] === 'string' ? req.headers['x-user-cpf'] : '';
    if (process.env.ROLES_ENFORCED === '1' && !cpf) return res.status(400).json({ error: 'cpf requerido para assinatura' });
    const operatorIdHeader = req.headers['aircompany'];
    const operatorId = typeof operatorIdHeader === 'string' ? operatorIdHeader : '';
    if (!operatorId) return res.status(400).json({ error: 'operator id required' });
    if (doc.anacOperatorId && operatorId !== doc.anacOperatorId) return res.status(403).json({ error: 'operador diferente do criador da etapa' });
    try {
      await signOperatorOnAnac(doc.anacEtapaId, operatorId, body.dataHorarioAssinaturaOperador);
      doc.dataHorarioAssinaturaOperador = body.dataHorarioAssinaturaOperador;
      doc.operatorCpfSignature = cpf;
      await doc.save();
      res.status(200).json({ ok: true, message: 'Etapa assinada com sucesso' });
      addAuditLog({ req, action: 'UPDATE', resource: 'logs', resourceId: id, statusCode: 200, payload: body });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  },
  deleteAnac: async (req, res) => {
    const id = req.params.id;
    const doc = await Log.findById(id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    const operatorIdHeader = req.headers['aircompany'];
    const operatorId = typeof operatorIdHeader === 'string' ? operatorIdHeader : '';
    if (!operatorId) return res.status(400).json({ error: 'operator id required' });
    if (doc.anacOperatorId && operatorId !== doc.anacOperatorId) return res.status(403).json({ error: 'operador diferente do criador da etapa' });
    try {
      await deleteFlightOnAnac(doc.anacEtapaId, operatorId);
      doc.deleted = true;
      await doc.save();
      const aircraft = await Aircraft.findOne();
      if (aircraft) {
        const old = doc.blockTimeHours || 0;
        aircraft.totalHours = Math.max(0, (aircraft.totalHours || 0) - old);
        aircraft.totalCycles = Math.max(0, (aircraft.totalCycles || 0) - (doc.numeroCicloEtapa || 0));
        await aircraft.save();
      }
      const remaining = await Log.find({ volumeId: doc.volumeId, deleted: { $ne: true } }).lean();
      const sumHours = remaining.reduce((acc, l) => acc + (l.blockTimeHours || 0), 0);
      const sumPousos = remaining.reduce((acc, l) => acc + (l.numeroPousoEtapa || 0), 0);
      const sumCiclos = remaining.reduce((acc, l) => acc + (l.numeroCicloEtapa || 0), 0);
      const meta = {
        volumeId: doc.volumeId,
        minutosTotaisVoo: Math.round(sumHours * 60),
        totalPousos: sumPousos,
        totalCiclosCelula: sumCiclos
      };
      const volDoc = await Volume.findById(doc.volumeId);
      const anacStatus = { etapaDelete: true, volumeUpdate: false };
      if (volDoc) {
        volDoc.minutosTotaisVooInicio = meta.minutosTotaisVoo;
        volDoc.totalPousosInicio = meta.totalPousos;
        volDoc.totalCiclosCelulaInicio = meta.totalCiclosCelula;
        if (volDoc.horasVooMotor && typeof volDoc.horasVooMotor === 'object') {
          const deltaMin = Math.round((doc.blockTimeHours || 0) * 60);
          const updated = {};
          for (const key of Object.keys(volDoc.horasVooMotor)) {
            const v = String(volDoc.horasVooMotor[key] || '0:00');
            const m = v.split(':');
            const totalMin = (parseInt(m[0] || '0', 10) * 60) + (parseInt(m[1] || '0', 10));
            const newMin = Math.max(0, totalMin - deltaMin);
            const hh = String(Math.floor(newMin / 60)).padStart(1, '0');
            const mm = String(newMin % 60).padStart(2, '0');
            updated[key] = `${hh}:${mm}`;
          }
          volDoc.horasVooMotor = updated;
        }
        if (volDoc.ciclosMotor && typeof volDoc.ciclosMotor === 'object') {
          const deltaCycles = doc.numeroCicloEtapa || 0;
          const updatedCycles = {};
          for (const key of Object.keys(volDoc.ciclosMotor)) {
            const v = String(volDoc.ciclosMotor[key] || '0');
            const n = parseInt(v, 10) || 0;
            updatedCycles[key] = String(Math.max(0, n - deltaCycles));
          }
          volDoc.ciclosMotor = updatedCycles;
        }
        await volDoc.save();
        if (volDoc.anacVolumeId) {
          try {
            await updateVolumeOnAnac(volDoc.anacVolumeId, operatorId, {
              numeroVolume: volDoc.numeroVolume,
              minutosTotaisVoo: meta.minutosTotaisVoo,
              totalPousos: meta.totalPousos,
              totalCiclosCelula: meta.totalCiclosCelula,
              horasVooMotor: volDoc.horasVooMotor,
              ciclosMotor: volDoc.ciclosMotor
            });
            anacStatus.volumeUpdate = true;
          } catch {}
        }
      }
      res.status(200).json({ ok: true, message: 'Registro excluído com sucesso', meta, anac: anacStatus });
      addAuditLog({ req, action: 'DELETE', resource: 'logs', resourceId: id, statusCode: 200, payload: { meta, anac: anacStatus } });
    } catch (e) {
      const anacStatus = { etapaDelete: false, volumeUpdate: false };
      res.status(400).json({ error: e.message, anac: anacStatus });
      addAuditLog({ req, action: 'DELETE', resource: 'logs', resourceId: id, statusCode: 400, payload: { error: e.message, anac: anacStatus } });
    }
  },
  queryAnac: async (req, res) => {
    const { volumeID, etapaID } = req.query;
    try {
      const result = await queryFlightsOnAnac({ volumeID, etapaID });
      res.json(result);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  }
};
