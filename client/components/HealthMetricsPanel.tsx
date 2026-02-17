import React, { useEffect, useState } from 'react';
import { apiGet } from '@/services/api';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface Props {
  onClose: () => void;
}

type HealthFull = {
  ok: boolean;
  uptimeSeconds?: number;
  mongo: { connected: boolean };
  redis: { connected: boolean };
  anac: { configured: boolean };
  security: { csrfEnabled: boolean; rolesEnforced: boolean; allowedOrigins: number };
  metrics: { anac: any; audit: any };
};

const HealthMetricsPanel: React.FC<Props> = ({ onClose }) => {
  const [data, setData] = useState<HealthFull | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [live, setLive] = useState(true);
  const [history, setHistory] = useState<Record<string, number[]>>({});

  const fetchHealth = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet<HealthFull>('/api/health/full');
      setData(res);
      const keys = Object.keys(res?.metrics?.anac || {});
      setHistory(prev => {
        const next: Record<string, number[]> = { ...prev };
        for (const k of keys) {
          const last = Number(res?.metrics?.anac?.[k]?.lastDurationMs || 0);
          const arr = Array.isArray(prev[k]) ? prev[k].slice(-19) : [];
          next[k] = [...arr, last];
        }
        return next;
      });
    } catch (e) {
      setError('Falha ao carregar health');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (live) fetchHealth();
    }, 10000);
    return () => clearInterval(id);
  }, [live]);

  const formatUptime = (sec?: number) => {
    if (!sec && sec !== 0) return '-';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    return `${h}h ${m}m ${s}s`;
  };

  const anacKeys = data ? Object.keys(data.metrics.anac || {}) : [];
  const auditResources = data ? Object.keys((data.metrics.audit?.byResource) || {}) : [];
  const buildSparkData = (b: any) => {
    const attempts = Number(b?.attempts || 0);
    const successes = Number(b?.successes || 0);
    const failures = Number(b?.failures || 0);
    const rate = attempts ? Math.round((successes / attempts) * 100) : 0;
    return [{ rate }, { rate }, { rate }];
  };
  const verifyResource = async (r: string) => {
    try {
      await apiGet(`/api/audit/verify?resource=${encodeURIComponent(r)}`);
      fetchHealth();
    } catch {}
  };
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-6 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-5xl bg-white rounded-xl shadow-card border border-gray-100" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-widest">Health & Métricas</h3>
          <div className="flex items-center gap-2">
            <button onClick={fetchHealth} className="btn-secondary">
              {loading ? 'Atualizando...' : 'Atualizar'}
            </button>
            <button onClick={() => setLive(v => !v)} className="btn-secondary">{live ? 'Pausar' : 'Ao Vivo'}</button>
            <button onClick={onClose} className="btn-secondary">Fechar</button>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-6">
            <h4 className="text-sm font-black uppercase text-gray-600 tracking-widest mb-4">Serviços</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${data?.mongo.connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                MongoDB: {data?.mongo.connected ? 'Conectado' : 'Desconectado'}
              </li>
              <li className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${data?.redis.connected ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                Redis: {data?.redis.connected ? 'Conectado' : 'Desabilitado/Indisponível'}
              </li>
              <li className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${data?.anac.configured ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                ANAC: {data?.anac.configured ? 'Credenciais configuradas' : 'Credenciais ausentes'}
              </li>
            </ul>
            <div className="mt-2 text-xs">
              Uptime: <span className="font-bold">{formatUptime(data?.uptimeSeconds)}</span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Segurança: CSRF {data?.security.csrfEnabled ? 'Ativo' : 'Inativo'} • RBAC {data?.security.rolesEnforced ? 'Enforced' : 'Livre'} • Origens permitidas: {data?.security.allowedOrigins}
            </div>
            {error && <div className="mt-3 text-xs text-red-600">{error}</div>}
          </div>

          <div className="card p-6">
            <h4 className="text-sm font-black uppercase text-gray-600 tracking-widest mb-4">ANAC</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {anacKeys.map(k => {
                const b = data?.metrics.anac[k];
                const ok = b && b.successes >= b.failures;
                const rate = b && b.attempts ? Math.round((b.successes / b.attempts) * 100) : 0;
                const hist = history[k] || [];
                const avg = hist.length ? Math.round(hist.reduce((a, c) => a + c, 0) / hist.length) : (b?.lastDurationMs || 0);
                return (
                  <div key={k} className={`p-3 rounded-lg border ${ok ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    <div className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                      <i className={`fas ${ok ? 'fa-check-circle text-green-600' : 'fa-exclamation-triangle text-red-600'}`}></i>
                      {k}
                    </div>
                    <div className="mt-2 text-xs">
                      Tentativas: <span className="font-bold">{b?.attempts || 0}</span> • Sucessos: <span className="font-bold">{b?.successes || 0}</span> • Falhas: <span className="font-bold">{b?.failures || 0}</span>
                    </div>
                    <div className="mt-2 h-6">
                      <ResponsiveContainer width="100%" height={24}>
                        <LineChart data={(hist.length ? hist : [b?.lastDurationMs || 0]).map((y, i) => ({ i, y }))}>
                          <Line type="monotone" dataKey="y" stroke={ok ? '#16a34a' : '#dc2626'} strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="y" stroke="#3b82f6" strokeWidth={1} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-1 text-[11px] text-gray-600">Taxa sucesso: {rate}% • Última: {b?.lastAt || '-'} • Média: {avg}ms</div>
                  </div>
                );
              })}
              {anacKeys.length === 0 && (
                <div className="text-xs text-gray-500">Sem métricas ANAC ainda.</div>
              )}
            </div>
          </div>

          <div className="card p-6 md:col-span-2">
            <h4 className="text-sm font-black uppercase text-gray-600 tracking-widest mb-4">Auditoria</h4>
            <div className="mb-3 text-xs">Falhas totais: <span className="font-bold">{data?.metrics.audit?.totalFailures || 0}</span> • Último check: {data?.metrics.audit?.lastCheckAt || '-'}</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {auditResources.map(r => {
                const b = data?.metrics.audit?.byResource?.[r];
                const ok = b && b.lastBreakIndex == null;
                return (
                  <div key={r} className={`p-3 rounded-lg border ${ok ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
                    <div className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                      <i className={`fas ${ok ? 'fa-link text-green-600' : 'fa-unlink text-yellow-600'}`}></i>
                      {r}
                    </div>
                    <div className="mt-2 text-xs">
                      Checks: <span className="font-bold">{b?.checks || 0}</span> • Falhas: <span className="font-bold">{b?.failures || 0}</span> • Total logs: <span className="font-bold">{b?.lastTotal || 0}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-gray-600">Último: {b?.lastAt || '-'} {b?.lastBreakIndex != null ? `• Quebra em ${b.lastBreakIndex}` : ''}</div>
                    <div className="mt-2">
                      <button className="btn-secondary text-xs" onClick={() => verifyResource(r)}>Verificar cadeia agora</button>
                    </div>
                  </div>
                );
              })}
              {auditResources.length === 0 && (
                <div className="text-xs text-gray-500">Sem métricas de auditoria ainda.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthMetricsPanel;
