const store = {
  anac: {
    getAccessToken: { attempts: 0, successes: 0, failures: 0, lastDurationMs: 0, lastAt: '' },
    openVolume: { attempts: 0, successes: 0, failures: 0, lastDurationMs: 0, lastAt: '' },
    closeVolume: { attempts: 0, successes: 0, failures: 0, lastDurationMs: 0, lastAt: '' },
    postFlight: { attempts: 0, successes: 0, failures: 0, lastDurationMs: 0, lastAt: '' }
  },
  audit: {
    byResource: {},
    lastCheckAt: '',
    totalFailures: 0
  }
};

export function recordAnac(op, success, durationMs) {
  const bucket = store.anac[op];
  if (!bucket) return;
  bucket.attempts += 1;
  bucket.lastDurationMs = durationMs || 0;
  bucket.lastAt = new Date().toISOString();
  if (success) bucket.successes += 1;
  else bucket.failures += 1;
}

export function getAnacMetrics() {
  return store.anac;
}

export function recordAuditCheck(resource, chainValid, total, breakIndex, rectifyCount) {
  const now = new Date().toISOString();
  store.audit.lastCheckAt = now;
  store.audit.byResource[resource] = store.audit.byResource[resource] || { checks: 0, failures: 0, lastTotal: 0, lastBreakIndex: null, lastRectifyCount: 0, lastAt: '' };
  const b = store.audit.byResource[resource];
  b.checks += 1;
  b.lastTotal = total || 0;
  b.lastBreakIndex = typeof breakIndex === 'number' ? breakIndex : null;
  b.lastRectifyCount = rectifyCount || 0;
  b.lastAt = now;
  if (chainValid === false) {
    b.failures += 1;
    store.audit.totalFailures += 1;
  }
}

export function getAuditMetrics() {
  return store.audit;
}
