import { AuditLog } from '../models/auditLog.js';
import crypto from 'crypto';

function stable(obj) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(stable);
  if (typeof obj === 'object') {
    const out = {};
    for (const k of Object.keys(obj).sort()) {
      out[k] = stable(obj[k]);
    }
    return out;
  }
  return obj;
}

async function computeChain(doc) {
  let prevHash = '';
  try {
    const q = { resource: doc.resource };
    if (doc.resourceId) q.resourceId = doc.resourceId;
    const last = await AuditLog.find(q).sort({ createdAt: -1 }).limit(1).lean();
    prevHash = Array.isArray(last) && last.length ? (last[0].hash || '') : '';
  } catch (e) { prevHash = ''; }
  const payload = JSON.stringify(stable(doc));
  const hash = crypto.createHash('sha256').update(prevHash + '|' + payload).digest('hex');
  return { prevHash, hash };
}

export async function addAuditLog({ req, action, resource, resourceId, statusCode, payload, oldValue, newValue, justification, changes }) {
  const ip = req.ip;
  const ua = req.headers['user-agent'] || '';
  const method = req.method;
  const user = (req.user && (req.user.email || req.user.id)) || undefined;
  try {
    const doc = { action, resource, resourceId, method, statusCode, user, ip, ua, payload };
    if (oldValue !== undefined) doc.oldValue = oldValue;
    if (newValue !== undefined) doc.newValue = newValue;
    if (Array.isArray(changes) && changes.length > 0) doc.changes = changes;
    if (action === 'RECTIFY') {
      if (!justification || typeof justification !== 'string' || justification.trim().length === 0) {
        throw new Error('justification requerido para ação RECTIFY');
      }
      doc.justification = justification;
    }
    const created = await AuditLog.create(doc);
    try {
      const chain = await computeChain(doc);
      await AuditLog.updateOne({ _id: created?._id }, { $set: chain });
    } catch (e) { void e; }
  } catch (e) { void e; }
}

export async function listAuditLogs({ limit = 100, offset = 0, resource, action, resourceId, verify }) {
  const query = {};
  if (resource) query.resource = resource;
  if (resourceId) query.resourceId = resourceId;
  if (action) query.action = action;
  const logsDesc = await AuditLog.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).lean();
  const logs = [...logsDesc].reverse().map(l => {
    return {
      ...l,
      ip: l.ip || l.metadata?.ip,
      ua: l.ua || l.metadata?.userAgent,
      statusCode: l.statusCode ?? l.metadata?.statusCode
    };
  });
  const total = await AuditLog.countDocuments(query);
  let chainValid = undefined;
  let breakIndex = undefined;
  if (verify) {
    let prev = '';
    chainValid = true;
    for (let i = 0; i < logs.length; i++) {
      const { prevHash: ph, hash: h, ...rest } = logs[i];
      const payload = JSON.stringify(stable(rest));
      const expected = crypto.createHash('sha256').update(prev + '|' + payload).digest('hex');
      if (ph !== prev || h !== expected) {
        chainValid = false;
        breakIndex = i;
        break;
      }
      prev = h;
    }
  }
  return { total, logs, chainValid, breakIndex };
}

export async function addAuditLogSystem({ action, resource, resourceId, payload, oldValue, newValue, changes, justification }) {
  try {
    const doc = {
      action,
      resource,
      resourceId,
      method: 'DB',
      statusCode: 0,
      user: 'system',
      ip: '',
      ua: '',
      payload
    };
    if (oldValue !== undefined) doc.oldValue = oldValue;
    if (newValue !== undefined) doc.newValue = newValue;
    if (Array.isArray(changes) && changes.length > 0) doc.changes = changes;
    if (action === 'RECTIFY') {
      if (!justification || typeof justification !== 'string' || justification.trim().length === 0) {
        throw new Error('justification requerido para ação RECTIFY');
      }
      doc.justification = justification;
    }
    const created = await AuditLog.create(doc);
    try {
      const chain = await computeChain(doc);
      await AuditLog.updateOne({ _id: created?._id }, { $set: chain });
    } catch (e) { void e; }
  } catch (e) { void e; }
}

export async function verifyAuditChain({ resource, resourceId }) {
  const query = {};
  if (resource) query.resource = resource;
  if (resourceId) query.resourceId = resourceId;
  const logs = await AuditLog.find(query).sort({ createdAt: 1 }).lean();
  let chainValid = true;
  let breakIndex = undefined;
  let prev = '';
  for (let i = 0; i < logs.length; i++) {
    const { prevHash: ph, hash: h, ...rest } = logs[i];
    const payload = JSON.stringify(stable(rest));
    const expected = crypto.createHash('sha256').update(prev + '|' + payload).digest('hex');
    if (ph !== prev || h !== expected) {
      chainValid = false;
      breakIndex = i;
      break;
    }
    prev = h;
  }
  return { total: logs.length, chainValid, breakIndex };
}
