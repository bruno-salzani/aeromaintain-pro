import { z } from 'zod';
const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const API_KEY = import.meta.env.VITE_ADMIN_API_KEY || '';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[2]) : null;
}

async function request(path: string, init: RequestInit & { schema?: z.ZodTypeAny; retry?: number } = {}) {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string> || {}), 'Content-Type': 'application/json' };
  if (API_KEY) headers['x-api-key'] = API_KEY;
  const method = (init.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const csrf = readCookie('XSRF-TOKEN');
    if (csrf) headers['x-csrf-token'] = csrf;
  }
  const retry = init.retry ?? 0;
  for (let attempt = 0; attempt <= retry; attempt++) {
    const res = await fetch(`${BASE}${path}`, { ...init, headers, credentials: 'include' });
    if (res.ok) {
      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await res.json() : await res.text();
      if (init.schema) {
        const parsed = init.schema.safeParse(data);
        if (!parsed.success) throw new Error('invalid response');
        return parsed.data;
      }
      return data;
    }
    if (attempt < retry && res.status >= 500) {
      await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
      continue;
    }
    const text = await res.text();
    throw new Error(text || 'api error');
  }
  throw new Error('api error');
}

export async function apiGet<T>(path: string): Promise<T> {
  return request(path, { method: 'GET' }) as Promise<T>;
}

export async function apiPost<T>(path: string, body: any): Promise<T> {
  return request(path, { method: 'POST', body: JSON.stringify(body) }) as Promise<T>;
}

export async function apiPatch<T>(path: string, body: any): Promise<T> {
  return request(path, { method: 'PATCH', body: JSON.stringify(body) }) as Promise<T>;
}

export async function apiPut<T>(path: string, body: any): Promise<T> {
  return request(path, { method: 'PUT', body: JSON.stringify(body) }) as Promise<T>;
}

export async function apiDelete(path: string): Promise<void> {
  await request(path, { method: 'DELETE' });
}

export async function apiGetSafe<T>(path: string, schema: z.ZodTypeAny, retry = 1): Promise<T> {
  return request(path, { method: 'GET', schema, retry }) as Promise<T>;
}

export async function apiPutWithHeaders<T>(path: string, body: any, headers: Record<string, string>): Promise<T> {
  return request(path, { method: 'PUT', body: JSON.stringify(body), headers }) as Promise<T>;
}

export async function apiGetWithHeaders<T>(path: string, headers: Record<string, string>): Promise<T> {
  return request(path, { method: 'GET', headers }) as Promise<T>;
}

export async function apiPostWithHeaders<T>(path: string, body: any, headers: Record<string, string>): Promise<T> {
  return request(path, { method: 'POST', body: JSON.stringify(body), headers }) as Promise<T>;
}

export async function apiDeleteWithHeaders(path: string, headers: Record<string, string>): Promise<void> {
  await request(path, { method: 'DELETE', headers });
}
