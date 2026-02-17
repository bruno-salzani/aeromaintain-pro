export function requireRole(allowed) {
  const enabled = process.env.ROLES_ENFORCED === '1';
  const set = new Set(Array.isArray(allowed) ? allowed : [allowed]);
  return (req, res, next) => {
    if (!enabled) return next();
    const role = (req.headers['x-role'] || '').toString().toUpperCase();
    const adminKey = process.env.ADMIN_API_KEY || '';
    const providedKey = req.headers['x-api-key'] || '';
    if (adminKey && providedKey === adminKey) return next();
    if (set.has(role)) return next();
    res.status(403).json({ error: 'forbidden: role required', required: Array.from(set) });
  };
}

const DEFAULT_SCOPE_MATRIX = {
  logs: {
    RECTIFY: ['OPERACOES', 'ADMINISTRADOR'],
    DELETE: ['ADMINISTRADOR'],
    UPDATE: ['OPERACOES', 'ADMINISTRADOR'],
    CREATE: ['TRIPULACAO', 'OPERACOES', 'ADMINISTRADOR']
  },
  components: {
    CREATE: ['MANUTENCAO', 'ADMINISTRADOR'],
    UPDATE: ['MANUTENCAO', 'ADMINISTRADOR'],
    DELETE: ['MANUTENCAO', 'ADMINISTRADOR']
  },
  compliance: {
    CREATE: ['ADMINISTRADOR'],
    DELETE: ['ADMINISTRADOR']
  },
  volumes: {
    OPEN: ['OPERACOES', 'ADMINISTRADOR'],
    CLOSE: ['OPERACOES', 'ADMINISTRADOR'],
    UPDATE: ['OPERACOES', 'ADMINISTRADOR']
  },
  aircraft: {
    UPDATE: ['OPERACOES', 'ADMINISTRADOR'],
    CREATE: ['OPERACOES', 'ADMINISTRADOR']
  }
};

export function requireScope(resource, action) {
  const enabled = process.env.ROLES_ENFORCED === '1';
  return (req, res, next) => {
    if (!enabled) return next();
    const role = (req.headers['x-role'] || '').toString().toUpperCase();
    const adminKey = process.env.ADMIN_API_KEY || '';
    const providedKey = req.headers['x-api-key'] || '';
    if (adminKey && providedKey === adminKey) return next();
    const allowed = DEFAULT_SCOPE_MATRIX[resource]?.[action] || [];
    if (allowed.includes(role)) return next();
    res.status(403).json({ error: 'forbidden: scope required', resource, action, required: allowed });
  };
}
