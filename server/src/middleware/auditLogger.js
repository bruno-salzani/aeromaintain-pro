import { addAuditLog } from '../services/auditService.js';

function mapAction(method, path) {
  if (method === 'POST') return 'CREATE';
  if (method === 'PUT' || method === 'PATCH') return 'UPDATE';
  if (method === 'DELETE') return 'DELETE';
  return method;
}

function extractResource(url) {
  const s = typeof url === 'string' ? url : '';
  if (s.startsWith('/api/')) {
    let rest = s.slice(5);
    if (rest.startsWith('v1/')) {
      rest = rest.slice(3);
    }
    let end = rest.length;
    const slash = rest.indexOf('/');
    const q = rest.indexOf('?');
    if (slash !== -1) end = Math.min(end, slash);
    if (q !== -1) end = Math.min(end, q);
    const seg = rest.slice(0, end);
    return seg || 'unknown';
  }
  return 'unknown';
}

export function auditLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    try {
      if (req.method === 'GET') return;
      const action = mapAction(req.method, req.originalUrl || req.url || '');
      const resource = extractResource(req.originalUrl || req.url || '');
      const resourceId = req.params?.id || undefined;
      addAuditLog({
        req,
        action,
        resource,
        resourceId,
        statusCode: res.statusCode,
        payload: undefined
      });
    } catch (e) { void e; }
  });
  next();
}
