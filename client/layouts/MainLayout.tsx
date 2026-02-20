import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAppDomain } from '@/state/AppDomain';
import { apiGet } from '@/services/api';

const nav = [
  { to: '/', label: 'Dashboard', icon: 'fa-chart-line' },
  { to: '/volumes', label: 'Diário de Bordo', icon: 'fa-book' },
  { to: '/flightlog', label: 'Etapas de Voo', icon: 'fa-plane-departure' },
  { to: '/maintenance', label: 'Manutenção', icon: 'fa-tools' },
  { to: '/components', label: 'Inventário', icon: 'fa-boxes' },
  { to: '/compliance', label: 'Conformidade', icon: 'fa-shield-halved' },
  { to: '/status', label: 'Status', icon: 'fa-heart-pulse' }
];

export default function MainLayout() {
  const { aircraft, volumes } = useAppDomain();
  const activeVolume = useMemo(() => volumes.find(v => v.status === 'ABERTO'), [volumes]);
  const [globalUptime, setGlobalUptime] = useState<string>('-');
  const [globalFailures, setGlobalFailures] = useState<number>(0);
  const [badgeColor, setBadgeColor] = useState<'green'|'amber'|'red'>('green');
  const location = useLocation();

  useEffect(() => {
    const load = async () => {
      try {
        const h = await apiGet<any>('/api/health/full');
        const s = Number(h?.uptimeSeconds || 0);
        const hStr = `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ${Math.floor(s % 60)}s`;
        setGlobalUptime(hStr);
        const m = await apiGet<any>('/api/metrics/audit');
        setGlobalFailures(Number(m?.totalFailures || 0));
        const hasCritical = !h?.mongo?.connected || (h?.redis && h?.redis?.connected === false);
        const failures = Number(m?.totalFailures || 0);
        setBadgeColor(hasCritical ? 'red' : failures > 0 ? 'amber' : 'green');
      } catch {}
    };
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  const title = useMemo(() => {
    const item = nav.find(n => n.to === location.pathname);
    return item?.label || 'AeroMaintain';
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gray-50">
      <aside className="w-full lg:w-64 bg-slate-900 text-white flex flex-col shadow-2xl z-50">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-xl font-bold italic">AM</div>
          <span className="text-xl font-black tracking-tighter uppercase">AeroMaintain</span>
        </div>
        <div className="px-4 py-2">
          <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">Aeronave Ativa</p>
            <p className="text-sm font-bold text-blue-400 mt-1">{aircraft.registration}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`w-2 h-2 rounded-full animate-pulse ${activeVolume ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className="text-xs text-slate-300">{activeVolume ? 'DBE Operacional' : 'Volume Fechado'}</span>
            </div>
          </div>
        </div>
        <nav className="flex-1 mt-6 px-2 space-y-1">
          {nav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }: { isActive: boolean }) =>
                `w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <i className={`fas ${item.icon} w-5 text-center group-hover:scale-110 transition-transform`}></i>
              <span className="font-semibold text-sm">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2 py-2">
            <img src="https://picsum.photos/40/40" className="rounded-full ring-2 ring-slate-700" alt="Avatar" />
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate">Heraldo Andrade</p>
              <p className="text-[10px] text-slate-500 font-medium">Inspetor Chefe</p>
            </div>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="container-app">
          <header className="mb-8 card p-4 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">{title}</h1>
              <p className="text-slate-500 font-medium mt-1">
                {aircraft.model} • MSN {aircraft.msn} • Padrão ANAC Resolução 458
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter flex items-center gap-1
                ${badgeColor === 'green' ? 'bg-green-100 text-green-700 border border-green-200' : ''}
                ${badgeColor === 'amber' ? 'bg-amber-100 text-amber-700 border border-amber-200' : ''}
                ${badgeColor === 'red' ? 'bg-red-100 text-red-700 border border-red-200' : ''}`}>
                <i className="fas fa-heart-pulse text-[10px]"></i> Uptime {globalUptime} • Falhas {globalFailures}
              </span>
              <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition card" title="Notificações">
                <i className="far fa-bell text-xl"></i>
              </button>
              <button className="btn-secondary text-sm">
                <i className="fas fa-file-export mr-2"></i> Pacote de Auditoria
              </button>
            </div>
          </header>
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
