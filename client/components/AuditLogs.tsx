import React, { useEffect, useState } from 'react';
import { AuditLog } from '@/types';
import { apiGet } from '@/services/api';

interface Props {
  onClose: () => void;
}

const resources = ['aircraft', 'components', 'volumes', 'logs', 'compliance'];
const actions = ['CREATE', 'UPDATE', 'DELETE', 'OPEN', 'CLOSE', 'RECTIFY'];

const AuditLogs: React.FC<Props> = ({ onClose }) => {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [resource, setResource] = useState<string>('');
  const [action, setAction] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resourceId, setResourceId] = useState<string>('');
  const [verifyInfo, setVerifyInfo] = useState<{ total: number; chainValid?: boolean; breakIndex?: number } | null>(null);
  const [onlyRectify, setOnlyRectify] = useState<boolean>(false);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (resource) params.set('resource', resource);
      if (resourceId) params.set('resourceId', resourceId);
      if (resource || resourceId) params.set('verify', '1');
      if (onlyRectify) params.set('action', 'RECTIFY');
      else if (action) params.set('action', action);
      const data = await apiGet<{ total: number; logs: AuditLog[]; chainValid?: boolean; breakIndex?: number }>(`/api/audit?${params.toString()}`);
      setItems(data.logs || []);
      if (data.chainValid === false) {
        setError(`Falha na cadeia de auditoria${typeof data.breakIndex === 'number' ? ` na posição ${data.breakIndex + 1}` : ''}`);
      }
    } catch (e) {
      setError('Falha ao carregar auditoria');
    } finally {
      setLoading(false);
    }
  };

  const verifyChain = async () => {
    setError(null);
    setVerifyInfo(null);
    try {
      const params = new URLSearchParams();
      if (resource) params.set('resource', resource);
      if (resourceId) params.set('resourceId', resourceId);
      const data = await apiGet<{ total: number; chainValid?: boolean; breakIndex?: number }>(`/api/audit/verify?${params.toString()}`);
      setVerifyInfo(data);
      if (data.chainValid === false) {
        setError(`Falha na cadeia completa${typeof data.breakIndex === 'number' ? ` na posição ${data.breakIndex + 1}` : ''}`);
      }
    } catch (e) {
      setError('Falha ao verificar cadeia completa');
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('audit_filters');
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (s.resource) setResource(s.resource);
        if (s.action) setAction(s.action);
        if (s.resourceId) setResourceId(s.resourceId);
        if (typeof s.onlyRectify === 'boolean') setOnlyRectify(s.onlyRectify);
      } catch {}
    }
    fetchLogs();
  }, []);

  useEffect(() => {
    localStorage.setItem('audit_filters', JSON.stringify({ resource, action, resourceId, onlyRectify }));
    fetchLogs();
  }, [resource, action, resourceId, onlyRectify]);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-6 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-6xl bg-white rounded-xl shadow-card border border-gray-100" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-widest">Auditoria de Sistema</h3>
          <div className="flex items-center gap-2">
            <select className="p-2 border rounded-lg text-sm bg-white" value={resource} onChange={e => setResource(e.target.value)}>
              <option value="">Todos recursos</option>
              {resources.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select className="p-2 border rounded-lg text-sm bg-white" value={action} onChange={e => setAction(e.target.value)}>
              <option value="">Todas ações</option>
              {actions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <input className="p-2 border rounded-lg text-sm bg-white" placeholder="resourceId" value={resourceId} onChange={e => setResourceId(e.target.value)} />
            <button onClick={fetchLogs} className="btn">Atualizar</button>
            <button onClick={verifyChain} className="btn">Verificar cadeia completa</button>
            <label className="inline-flex items-center gap-2 text-xs ml-2">
              <input type="checkbox" checked={onlyRectify} onChange={e => setOnlyRectify(e.target.checked)} />
              apenas RECTIFY
            </label>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition" aria-label="Fechar" title="Fechar">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>
        {verifyInfo && (
          <div className="p-4">
            {verifyInfo.chainValid === false ? (
              <span className="badge-danger">Cadeia inválida • total {verifyInfo.total}{typeof verifyInfo.breakIndex === 'number' ? ` • quebra ${verifyInfo.breakIndex + 1}` : ''}</span>
            ) : (
              <span className="badge-success">Cadeia válida • total {verifyInfo.total}</span>
            )}
          </div>
        )}
        {error && <div className="p-4"><span className="badge-danger">{error}</span></div>}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs font-bold text-gray-600 uppercase tracking-widest bg-gray-50/50">
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Recurso</th>
                <th className="px-6 py-4">Ação</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">IP</th>
                <th className="px-6 py-4">Agente</th>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">PrevHash</th>
                <th className="px-6 py-4">Hash</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-6 py-4 text-sm text-gray-500" colSpan={7}>Carregando...</td></tr>
              ) : items.length === 0 ? (
                <tr><td className="px-6 py-8 text-center text-sm text-gray-500" colSpan={9}>Sem registros</td></tr>
              ) : (
                items.map(l => (
                  <tr key={(l.id || l.resourceId || Math.random().toString(36))} className="border-t">
                    <td className="px-6 py-4">{l.createdAt ? new Date(l.createdAt).toLocaleString() : ''}</td>
                    <td className="px-6 py-4">{l.resource}</td>
                    <td className="px-6 py-4">
                      {l.action === 'RECTIFY' ? (
                        <span className="badge-warning">Retificação</span>
                      ) : (
                        <span className="badge">{l.action}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">{l.statusCode}</td>
                    <td className="px-6 py-4">{l.ip}</td>
                    <td className="px-6 py-4">{l.ua}</td>
                    <td className="px-6 py-4">{l.resourceId}</td>
                    <td className="px-6 py-4 text-[10px] break-all">{(l as any).prevHash || ''}</td>
                    <td className="px-6 py-4 text-[10px] break-all">
                      {(l as any).hash ? (
                        <div className="flex items-center gap-2">
                          <span className="break-all">{(l as any).hash}</span>
                          <button className="btn-muted text-xs" onClick={() => navigator.clipboard.writeText((l as any).hash)}>copiar</button>
                        </div>
                      ) : ''}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
