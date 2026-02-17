import { Component } from '../models/component.js';
import { addAuditLog } from '../services/auditService.js';

function pickChangedFields(oldObj = {}, newObj = {}) {
  const changes = {};
  for (const key of Object.keys(newObj)) {
    const oldVal = oldObj[key];
    const newVal = newObj[key];
    const oldJson = JSON.stringify(oldVal);
    const newJson = JSON.stringify(newVal);
    if (oldJson !== newJson) {
      changes[key] = { oldValue: oldVal, newValue: newVal };
    }
  }
  return changes;
}

export function auditComponentChange(action) {
  return async function audit(req, res, next) {
    const id = req.params.id;
    let original = null;
    if (action === 'UPDATE' || action === 'DELETE') {
      try { original = id ? await Component.findById(id).lean() : null; } catch {}
    }
    const origJson = res.json.bind(res);
    const origEnd = res.end.bind(res);
    res.json = function(body) {
      try {
        const resourceId = (action === 'CREATE') ? (body?.id || body?._id?.toString() || '') : id;
        if (action === 'UPDATE') {
          const changes = pickChangedFields(original || {}, req.body || {});
          const oldValue = {};
          const newValue = {};
          for (const k of Object.keys(changes)) {
            oldValue[k] = changes[k].oldValue;
            newValue[k] = changes[k].newValue;
          }
          addAuditLog({ req, action, resource: 'components', resourceId, statusCode: res.statusCode || 200, payload: req.body, oldValue, newValue });
        } else if (action === 'CREATE') {
          addAuditLog({ req, action, resource: 'components', resourceId, statusCode: res.statusCode || 201, payload: req.body, oldValue: null, newValue: body });
        }
      } catch {}
      return origJson(body);
    };
    res.end = function(...args) {
      try {
        if (action === 'DELETE') {
          const resourceId = id;
          addAuditLog({ req, action, resource: 'components', resourceId, statusCode: res.statusCode || 204, payload: null, oldValue: original, newValue: null });
        }
      } catch {}
      return origEnd(...args);
    };
    next();
  };
}
