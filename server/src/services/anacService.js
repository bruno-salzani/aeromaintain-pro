import { config } from '../config.js';
import pino from 'pino';
import { recordAnac } from './metricsService.js';
import crypto from 'crypto';

const logger = pino();
let cachedToken = { token: '', expiresAt: 0 };

function formatDateBR(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

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

function makeIdempotencyKey(prefix, parts) {
  const base = JSON.stringify(stable(parts));
  const hash = crypto.createHash('sha256').update(`${prefix}|${base}`).digest('hex');
  return `${prefix}:${hash}`;
}

export async function getAccessToken() {
  if (cachedToken.token && Date.now() < cachedToken.expiresAt - 60_000) return cachedToken.token;
  const url = config.anacSsoTokenUrl;
  const body = new URLSearchParams();
  body.set('client_id', config.anacClientId || 'client-api-diariodebordo');
  body.set('username', config.anacUsername || '');
  body.set('password', config.anacPassword || '');
  body.set('grant_type', 'password');
  let lastErr = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    const start = Date.now();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    if (res.ok) {
      const json = await res.json().catch(async () => ({ raw: await res.text() }));
      const token = json.access_token;
      const expiresIn = Number(json.expires_in || 1800);
      cachedToken = { token, expiresAt: Date.now() + expiresIn * 1000 };
      logger.info({ op: 'getAccessToken', attempt: attempt + 1, durationMs: Date.now() - start }, 'ANAC SSO token obtained');
      recordAnac('getAccessToken', true, Date.now() - start);
      return token;
    }
    const text = await res.text().catch(() => '');
    lastErr = `ANAC SSO error: ${res.status} ${text}`;
    logger.warn({ op: 'getAccessToken', attempt: attempt + 1, durationMs: Date.now() - start, status: res.status }, 'ANAC SSO attempt failed');
    recordAnac('getAccessToken', false, Date.now() - start);
    await new Promise(r => setTimeout(r, 250 * (attempt + 1)));
  }
  throw new Error(lastErr || 'ANAC SSO error');
}

export async function openVolumeOnAnac(payload) {
  const url = `${config.anacApiBaseUrl}/DiarioDeBordo/Volume`;
  const matricula = String(payload.matriculaAeronave || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const dataAbertura = payload.dataAberturaVolume || formatDateBR(payload.dataAbertura || new Date().toISOString());
  const body = {
    matriculaAeronave: matricula,
    dataAberturaVolume: dataAbertura,
    numeroVolume: payload.numeroVolume,
    minutosTotaisVoo: String(payload.minutosTotaisVoo || payload.minutosTotaisVooInicio || 0),
    totalPousos: String(payload.totalPousos || payload.totalPousosInicio || 0),
    totalCiclosCelula: String(payload.totalCiclosCelula || payload.totalCiclosCelulaInicio || 0),
    observacoesTermoDeAbertura: payload.observacoesTermoDeAbertura || payload.observacoesAbertura || '',
    horasVooMotor: payload.horasVooMotor || undefined,
    ciclosMotor: payload.ciclosMotor || undefined
  };
  let lastErr = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const token = await getAccessToken();
      const start = Date.now();
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Idempotency-Key': makeIdempotencyKey('volume:open', { matricula, numeroVolume: body.numeroVolume, dataAbertura })
        },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const duration = Date.now() - start;
        let ids = {};
        try {
          ids = await res.json();
        } catch {
          const text = await res.text().catch(() => '');
          logger.warn('ANAC Volume response not JSON, raw text saved');
          ids = { raw: text };
        }
        const volId = ids.idDiarioBordoVolume || ids.Volume?.idDiarioBordoVolume || ids.id || null;
        const opIds = ids.idDiarioBordoOperador ? [ids.idDiarioBordoOperador] : ids.Operadores || [];
        logger.info({ op: 'openVolume', attempt: attempt + 1, durationMs: duration, volId, opIds }, 'ANAC volume opened');
        recordAnac('openVolume', true, duration);
        return { volId, opIds, requestBody: body };
      }
      const textErr = await res.text().catch(() => '');
      lastErr = `ANAC Volume error: ${res.status} ${textErr}`;
      logger.warn({ op: 'openVolume', attempt: attempt + 1, durationMs: Date.now() - start, status: res.status }, 'ANAC volume attempt failed');
      recordAnac('openVolume', false, Date.now() - start);
    } catch (e) {
      lastErr = (e && e.message) || 'ANAC Volume error';
      logger.warn({ op: 'openVolume', attempt: attempt + 1 }, 'ANAC volume network error');
    }
    await new Promise(r => setTimeout(r, 250 * (attempt + 1)));
  }
  throw new Error(lastErr || 'ANAC Volume error');
}

export async function closeVolumeOnAnac(volId) {
  if (!volId) return;
  const url = `${config.anacApiBaseUrl}/DiarioDeBordo/Volume/${volId}/Fechar`;
  let lastErr = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const token = await getAccessToken();
      const start = Date.now();
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const duration = Date.now() - start;
        logger.info({ op: 'closeVolume', volId, attempt: attempt + 1, durationMs: duration }, 'ANAC volume closed');
        recordAnac('closeVolume', true, duration);
        return;
      }
      const txt = await res.text().catch(() => '');
      lastErr = `ANAC close volume failed: ${res.status} ${txt}`;
      logger.warn({ op: 'closeVolume', volId, attempt: attempt + 1, durationMs: Date.now() - start, status: res.status }, 'ANAC close attempt failed');
      recordAnac('closeVolume', false, Date.now() - start);
    } catch (e) {
      lastErr = (e && e.message) || 'ANAC close volume network error';
      logger.warn({ op: 'closeVolume', volId, attempt: attempt + 1 }, 'ANAC close network error');
    }
    await new Promise(r => setTimeout(r, 250 * (attempt + 1)));
  }
  logger.warn({ volId, err: lastErr }, 'closeVolumeOnAnac failed after retries');
}

export async function postFlightOnAnac(payload) {
  const url = `${config.anacApiBaseUrl}/DiarioDeBordo/EtapaVoo`;
  let lastErr = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const token = await getAccessToken();
      const start = Date.now();
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'aircompany': String(payload.idDiarioBordoOperador || ''),
          'Idempotency-Key': makeIdempotencyKey('flight:create', { vol: payload.idDiarioBordoVolume, op: payload.idDiarioBordoOperador, partida: payload.horarioPartida, corte: payload.horarioCorteMotores })
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const duration = Date.now() - start;
        const json = await res.json().catch(async () => ({ raw: await res.text() }));
        const etapaId = json.idEtapaVoo || json.id || null;
        logger.info({ op: 'postFlight', attempt: attempt + 1, durationMs: duration, etapaId }, 'ANAC etapa criada');
        recordAnac('postFlight', true, duration);
        return etapaId;
      }
      const txt = await res.text().catch(() => '');
      lastErr = `ANAC Flight error: ${res.status} ${txt}`;
      logger.warn({ op: 'postFlight', attempt: attempt + 1, durationMs: Date.now() - start, status: res.status }, 'ANAC etapa tentativa falhou');
      recordAnac('postFlight', false, Date.now() - start);
    } catch (e) {
      lastErr = (e && e.message) || 'ANAC Flight error';
      logger.warn({ op: 'postFlight', attempt: attempt + 1 }, 'ANAC etapa network error');
    }
    await new Promise(r => setTimeout(r, 250 * (attempt + 1)));
  }
  logger.warn({ err: lastErr }, 'postFlightOnAnac failed after retries');
  return null;
}

export async function updateFlightOnAnac(etapaId, operatorId, payload) {
  const url = `${config.anacApiBaseUrl}/DiarioDeBordo/EtapaVoo/${etapaId}`;
  let lastErr = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const token = await getAccessToken();
      const start = Date.now();
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'aircompany': String(operatorId || ''),
          'Idempotency-Key': makeIdempotencyKey('flight:update', { etapaId, operatorId, partida: payload.horarioPartida, corte: payload.horarioCorteMotores, tempo: payload.tempoVooTotal })
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const duration = Date.now() - start;
        const json = await res.json().catch(async () => ({ raw: await res.text() }));
        const newId = json.idEtapaVoo || json.id || null;
        logger.info({ op: 'updateFlight', attempt: attempt + 1, durationMs: duration, etapaId, newId }, 'ANAC etapa atualizada');
        recordAnac('postFlight', true, duration);
        return newId;
      }
      const txt = await res.text().catch(() => '');
      lastErr = `ANAC Update Flight error: ${res.status} ${txt}`;
      logger.warn({ op: 'updateFlight', attempt: attempt + 1, durationMs: Date.now() - start, status: res.status }, 'ANAC etapa update tentativa falhou');
      recordAnac('postFlight', false, Date.now() - start);
    } catch (e) {
      lastErr = (e && e.message) || 'ANAC Update Flight error';
      logger.warn({ op: 'updateFlight', attempt: attempt + 1 }, 'ANAC etapa update network error');
    }
    await new Promise(r => setTimeout(r, 250 * (attempt + 1)));
  }
  throw new Error(lastErr || 'ANAC Update Flight error');
}

export async function signOperatorOnAnac(etapaId, operatorId, dataHorarioAssinaturaOperador) {
  const url = `${config.anacApiBaseUrl}/DiarioDeBordo/EtapaVoo/Operador/${etapaId}`;
  let lastErr = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const token = await getAccessToken();
      const start = Date.now();
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'aircompany': String(operatorId || ''),
          'Idempotency-Key': makeIdempotencyKey('flight:sign', { etapaId, operatorId, dataHorarioAssinaturaOperador })
        },
        body: JSON.stringify({ dataHorarioAssinaturaOperador })
      });
      if (res.ok) {
        const duration = Date.now() - start;
        logger.info({ op: 'signOperator', attempt: attempt + 1, durationMs: duration, etapaId }, 'ANAC etapa assinada por operador');
        recordAnac('postFlight', true, duration);
        return true;
      }
      const txt = await res.text().catch(() => '');
      lastErr = `ANAC Sign Operator error: ${res.status} ${txt}`;
      logger.warn({ op: 'signOperator', attempt: attempt + 1, durationMs: Date.now() - start, status: res.status }, 'ANAC assinatura operador tentativa falhou');
      recordAnac('postFlight', false, Date.now() - start);
    } catch (e) {
      lastErr = (e && e.message) || 'ANAC Sign Operator error';
      logger.warn({ op: 'signOperator', attempt: attempt + 1 }, 'ANAC assinatura operador network error');
    }
    await new Promise(r => setTimeout(r, 250 * (attempt + 1)));
  }
  throw new Error(lastErr || 'ANAC Sign Operator error');
}

export async function deleteFlightOnAnac(etapaId, operatorId) {
  const url = `${config.anacApiBaseUrl}/DiarioDeBordo/EtapaVoo/${etapaId}`;
  let lastErr = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const token = await getAccessToken();
      const start = Date.now();
      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'aircompany': String(operatorId || ''),
          'Idempotency-Key': makeIdempotencyKey('flight:delete', { etapaId, operatorId })
        }
      });
      if (res.ok) {
        const duration = Date.now() - start;
        logger.info({ op: 'deleteFlight', attempt: attempt + 1, durationMs: duration, etapaId }, 'ANAC etapa deletada');
        recordAnac('postFlight', true, duration);
        return true;
      }
      const txt = await res.text().catch(() => '');
      lastErr = `ANAC Delete Flight error: ${res.status} ${txt}`;
      logger.warn({ op: 'deleteFlight', attempt: attempt + 1, durationMs: Date.now() - start, status: res.status }, 'ANAC delete tentativa falhou');
      recordAnac('postFlight', false, Date.now() - start);
    } catch (e) {
      lastErr = (e && e.message) || 'ANAC Delete Flight error';
      logger.warn({ op: 'deleteFlight', attempt: attempt + 1 }, 'ANAC delete network error');
    }
    await new Promise(r => setTimeout(r, 250 * (attempt + 1)));
  }
  throw new Error(lastErr || 'ANAC Delete Flight error');
}

export async function queryFlightsOnAnac({ volumeID, etapaID }) {
  const qs = new URLSearchParams();
  if (volumeID) qs.set('volumeID', String(volumeID));
  if (etapaID) qs.set('etapaID', String(etapaID));
  const url = `${config.anacApiBaseUrl}/DiarioDeBordo/EtapaVoo/?${qs.toString()}`;
  let lastErr = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const token = await getAccessToken();
      const start = Date.now();
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const duration = Date.now() - start;
        const json = await res.json().catch(async () => ({ raw: await res.text() }));
        logger.info({ op: 'queryFlights', attempt: attempt + 1, durationMs: duration, volumeID, etapaID }, 'ANAC etapas consultadas');
        recordAnac('postFlight', true, duration);
        return json;
      }
      const txt = await res.text().catch(() => '');
      lastErr = `ANAC Query Flights error: ${res.status} ${txt}`;
      logger.warn({ op: 'queryFlights', attempt: attempt + 1, durationMs: Date.now() - start, status: res.status }, 'ANAC query tentativa falhou');
      recordAnac('postFlight', false, Date.now() - start);
    } catch (e) {
      lastErr = (e && e.message) || 'ANAC Query Flights error';
      logger.warn({ op: 'queryFlights', attempt: attempt + 1 }, 'ANAC query network error');
    }
    await new Promise(r => setTimeout(r, 250 * (attempt + 1)));
  }
  throw new Error(lastErr || 'ANAC Query Flights error');
}

export async function updateVolumeOnAnac(volId, operatorId, payload) {
  const url = `${config.anacApiBaseUrl}/DiarioDeBordo/Volume/${volId}`;
  let lastErr = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const token = await getAccessToken();
      const start = Date.now();
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'aircompany': String(operatorId || ''),
          'Idempotency-Key': makeIdempotencyKey('volume:update', { volId, operatorId, numero: payload.numeroVolume, minutosTotaisVoo: payload.minutosTotaisVoo, totalPousos: payload.totalPousos, totalCiclosCelula: payload.totalCiclosCelula })
        },
        body: JSON.stringify({
          numeroVolume: String(payload.numeroVolume || ''),
          minutosTotaisVoo: String(payload.minutosTotaisVoo ?? '0'),
          totalPousos: String(payload.totalPousos ?? '0'),
          totalCiclosCelula: String(payload.totalCiclosCelula ?? '0'),
          observacoesTermoDeAbertura: payload.observacoesTermoDeAbertura || undefined,
          horasVooMotor: payload.horasVooMotor || undefined,
          ciclosMotor: payload.ciclosMotor || undefined
        })
      });
      if (res.ok) {
        const duration = Date.now() - start;
        logger.info({ op: 'updateVolume', volId, attempt: attempt + 1, durationMs: duration }, 'ANAC volume atualizado');
        return true;
      }
      const txt = await res.text().catch(() => '');
      lastErr = `ANAC Update Volume error: ${res.status} ${txt}`;
      logger.warn({ op: 'updateVolume', volId, attempt: attempt + 1, durationMs: Date.now() - start, status: res.status }, 'ANAC update attempt failed');
    } catch (e) {
      lastErr = (e && e.message) || 'ANAC Update Volume error';
      logger.warn({ op: 'updateVolume', volId, attempt: attempt + 1 }, 'ANAC update network error');
    }
    await new Promise(r => setTimeout(r, 250 * (attempt + 1)));
  }
  throw new Error(lastErr || 'ANAC Update Volume error');
}

export async function closeVolumePutOnAnac(volId, operatorId, payload) {
  const url = `${config.anacApiBaseUrl}/DiarioDeBordo/closeVolume/${volId}`;
  let lastErr = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const token = await getAccessToken();
      const start = Date.now();
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'aircompany': String(operatorId || ''),
          'Idempotency-Key': makeIdempotencyKey('volume:close', { volId, operatorId, dataFechamentoVolume: payload.dataFechamentoVolume })
        },
        body: JSON.stringify({
          dataFechamentoVolume: String(payload.dataFechamentoVolume || ''),
          minutosTotaisVoo: String(payload.minutosTotaisVoo ?? '0'),
          totalPousos: String(payload.totalPousos ?? '0'),
          totalCiclosCelula: String(payload.totalCiclosCelula ?? '0'),
          observacoesTermoDeFechamento: payload.observacoesTermoDeFechamento || undefined,
          horasVooMotor: payload.horasVooMotor || undefined,
          ciclosMotor: payload.ciclosMotor || undefined
        })
      });
      if (res.ok) {
        const duration = Date.now() - start;
        const json = await res.json().catch(async () => ({ raw: await res.text() }));
        logger.info({ op: 'closeVolumePut', volId, attempt: attempt + 1, durationMs: duration }, 'ANAC volume fechado via PUT');
        recordAnac('closeVolume', true, duration);
        return json;
      }
      const txt = await res.text().catch(() => '');
      lastErr = `ANAC Close Volume PUT error: ${res.status} ${txt}`;
      logger.warn({ op: 'closeVolumePut', volId, attempt: attempt + 1, durationMs: Date.now() - start, status: res.status }, 'ANAC close PUT attempt failed');
      recordAnac('closeVolume', false, Date.now() - start);
    } catch (e) {
      lastErr = (e && e.message) || 'ANAC Close Volume PUT error';
      logger.warn({ op: 'closeVolumePut', volId, attempt: attempt + 1 }, 'ANAC close PUT network error');
    }
    await new Promise(r => setTimeout(r, 250 * (attempt + 1)));
  }
  throw new Error(lastErr || 'ANAC Close Volume PUT error');
}

export async function fetchVolumeOnAnac(volId, operatorId) {
  const url = `${config.anacApiBaseUrl}/DiarioDeBordo/Volume/${volId}`;
  let lastErr = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const token = await getAccessToken();
      const start = Date.now();
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'aircompany': String(operatorId || '')
        }
      });
      if (res.ok) {
        const duration = Date.now() - start;
        const json = await res.json().catch(async () => ({ raw: await res.text() }));
        logger.info({ op: 'getVolume', volId, attempt: attempt + 1, durationMs: duration }, 'ANAC volume fetched');
        recordAnac('getVolume', true, duration);
        return json;
      }
      const txt = await res.text().catch(() => '');
      lastErr = `ANAC Get Volume error: ${res.status} ${txt}`;
      logger.warn({ op: 'getVolume', volId, attempt: attempt + 1, durationMs: Date.now() - start, status: res.status }, 'ANAC get volume attempt failed');
      recordAnac('getVolume', false, Date.now() - start);
    } catch (e) {
      lastErr = (e && e.message) || 'ANAC Get Volume error';
      logger.warn({ op: 'getVolume', volId, attempt: attempt + 1 }, 'ANAC get volume network error');
    }
    await new Promise(r => setTimeout(r, 250 * (attempt + 1)));
  }
  throw new Error(lastErr || 'ANAC Get Volume error');
}

export async function queryVolumesOnAnac(params = {}) {
  const qs = new URLSearchParams();
  const nrMatricula = params.nrMatricula ? String(params.nrMatricula).trim() : '';
  const volumeId = params.volumeId != null ? String(params.volumeId).trim() : '';
  const nrVolume = params.nrVolume ? String(params.nrVolume).trim() : '';
  if (nrMatricula) qs.set('nrMatricula', nrMatricula);
  if (volumeId) qs.set('volumeId', volumeId);
  if (nrVolume) qs.set('nrVolume', nrVolume);
  if ([...qs.keys()].length === 0) throw new Error('at least one query parameter required');
  const url = `${config.anacApiBaseUrl}/DiarioDeBordo/Volume?${qs.toString()}`;
  let lastErr = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const token = await getAccessToken();
      const start = Date.now();
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const duration = Date.now() - start;
        const json = await res.json().catch(async () => ({ raw: await res.text() }));
        logger.info({ op: 'queryVolumes', attempt: attempt + 1, durationMs: duration, params: { nrMatricula, volumeId, nrVolume } }, 'ANAC volumes queried');
        recordAnac('getVolume', true, duration);
        return Array.isArray(json) ? json : [json];
      }
      const txt = await res.text().catch(() => '');
      lastErr = `ANAC Query Volumes error: ${res.status} ${txt}`;
      logger.warn({ op: 'queryVolumes', attempt: attempt + 1, durationMs: Date.now() - start, status: res.status }, 'ANAC query attempt failed');
      recordAnac('getVolume', false, Date.now() - start);
    } catch (e) {
      lastErr = (e && e.message) || 'ANAC Query Volumes error';
      logger.warn({ op: 'queryVolumes', attempt: attempt + 1 }, 'ANAC query network error');
    }
    await new Promise(r => setTimeout(r, 250 * (attempt + 1)));
  }
  throw new Error(lastErr || 'ANAC Query Volumes error');
}
