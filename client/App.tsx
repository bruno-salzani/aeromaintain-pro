
import React, { useEffect, useState } from 'react';
import { Aircraft, FlightLog, Component, MaintenanceTask, WorkOrder, MaintenanceStatus, Volume, ComplianceItem, User } from '@/types';
import { INITIAL_AIRCRAFT, MOCK_COMPONENTS, MOCK_TASKS } from '@/constants';
import Dashboard from '@/components/Dashboard';
import MaintenanceManager from '@/components/MaintenanceManager';
import FlightLogBook from '@/components/FlightLogBook';
import ComponentsManager from '@/components/ComponentsManager';
import VolumeManager from '@/components/VolumeManager';
import ComplianceManager from '@/components/ComplianceManager';
import AdminQuickActions from '@/components/AdminQuickActions';
import HealthMetricsPanel from '@/components/HealthMetricsPanel';
import { useComponents } from '@/hooks/useComponents';
import { useMaintenanceTasks } from '@/hooks/useMaintenanceTasks';
import { useVolumes } from '@/hooks/useVolumes';
import { apiPutWithHeaders, apiGet } from '@/services/api';
import { useCompliance } from '@/hooks/useCompliance';
import { useUsers } from '@/hooks/useUsers';
import UsersManager from '@/components/UsersManager';
import AircraftModal from '@/components/AircraftModal';
import AuditLogs from '@/components/AuditLogs';
import { AppStateProvider } from '@/state/AppState';
import AuthForms from '@/components/AuthForms';

type Tab = 'dashboard' | 'maintenance' | 'flightlog' | 'volumemanager' | 'components' | 'compliance' | 'status';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [aircraft, setAircraft] = useState<Aircraft>(INITIAL_AIRCRAFT);
  const [logs, setLogs] = useState<FlightLog[]>([]);
  const { components, addComponent, updateComponent, deleteComponent, setComponents } = useComponents(MOCK_COMPONENTS, aircraft);
  const { tasks, deleteTask, setTasks } = useMaintenanceTasks(MOCK_TASKS);
  const { volumes, addVolume, closeVolume, setVolumes, updateVolumeLocal } = useVolumes([]);
  const { complianceItems, addComplianceItem, deleteComplianceItem } = useCompliance([
    {
      id: 'da1',
      type: 'DA',
      referenceNumber: '2019-02-01',
      description: 'Inspeção periódica do pitch trim actuator',
      applicableTo: 'Célula',
      ata: '27',
      effectiveDate: '2019-02-27',
      status: 'PENDENTE',
      nextDueHours: 1710
    }
  ]);
  const { users, addUser, updateUser, deleteUser } = useUsers([]);
  const [showUsers, setShowUsers] = useState(false);
  const [showAircraftModal, setShowAircraftModal] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [showHealth, setShowHealth] = useState(false);
  const [globalUptime, setGlobalUptime] = useState<string>('-');
  const [globalFailures, setGlobalFailures] = useState<number>(0);
  const [badgeColor, setBadgeColor] = useState<'green'|'amber'|'red'>('green');

  useEffect(() => {
    apiGet('/api/csrf').catch(() => void 0);
    apiGet<Aircraft>('/api/aircraft')
      .then(data => {
        if (data) setAircraft(data as any);
      })
      .catch(() => void 0);
  }, []);

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
  const addFlightLog = (newLog: Omit<FlightLog, 'id'>) => {
    const log: FlightLog = {
      ...newLog,
      id: Math.random().toString(36).substr(2, 9)
    } as FlightLog;
    
    setLogs(prev => [log, ...prev]);

    // Block time calculation for simplified aircraft total hours update
    const blockTime = (newLog as any).blockTimeHours || 0;

    setAircraft(prev => ({
      ...prev,
      totalHours: prev.totalHours + blockTime,
      totalCycles: prev.totalCycles + log.numeroCicloEtapa
    }));

    setComponents(prev => prev.map(c => {
      if (c.remainingHours !== undefined) {
        const newRemaining = c.remainingHours - blockTime;
        return {
          ...c,
          remainingHours: newRemaining,
          status: newRemaining < 0 ? MaintenanceStatus.VENCIDO : newRemaining < 50 ? MaintenanceStatus.CRITICO : MaintenanceStatus.OK
        };
      }
      return c;
    }));
  };

  const deleteFlightLog = (id: string) => {
    setLogs(prevLogs => {
      const logToDelete = prevLogs.find(l => l.id === id);
      if (!logToDelete) return prevLogs;

      const blockTime = (logToDelete as any).blockTimeHours || 0;

      setAircraft(prevAircraft => ({
        ...prevAircraft,
        totalHours: Math.max(0, prevAircraft.totalHours - blockTime),
        totalCycles: Math.max(0, prevAircraft.totalCycles - logToDelete.numeroCicloEtapa)
      }));

      return prevLogs.filter(l => l.id !== id);
    });
  };

 

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-line' },
    { id: 'volumemanager', label: 'Diário de Bordo', icon: 'fa-book' },
    { id: 'flightlog', label: 'Etapas de Voo', icon: 'fa-plane-departure' },
    { id: 'maintenance', label: 'Manutenção', icon: 'fa-tools' },
    { id: 'components', label: 'Inventário', icon: 'fa-boxes' },
    { id: 'compliance', label: 'Conformidade', icon: 'fa-shield-halved' },
    { id: 'status', label: 'Status', icon: 'fa-heart-pulse' },
  ];

  const activeVolume = volumes.find(v => v.status === 'ABERTO');

  if (!isAuthenticated) {
    return <AuthForms onAuthenticated={() => setIsAuthenticated(true)} />;
  }
  return (
    <AppStateProvider>
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
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                activeTab === item.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <i className={`fas ${item.icon} w-5 text-center group-hover:scale-110 transition-transform`}></i>
              <span className="font-semibold text-sm">{item.label}</span>
            </button>
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
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">
              {navItems.find(n => n.id === activeTab)?.label}
            </h1>
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
          {activeTab === 'dashboard' && (
            <>
              <AdminQuickActions 
                onAddUser={() => setShowUsers(true)} 
                onAddAircraft={() => setShowAircraftModal(true)} 
                onViewLogs={() => setShowAudit(true)}
                onViewHealth={() => setShowHealth(true)}
              />
              <Dashboard aircraft={aircraft} components={components} />
              {showUsers && (
                <UsersManager 
                  users={users}
                  onAdd={addUser}
                  onUpdate={updateUser}
                  onDelete={deleteUser}
                  onClose={() => setShowUsers(false)}
                />
              )}
              {showAircraftModal && (
                <AircraftModal 
                  aircraft={aircraft}
                  onSaveLocal={(a) => setAircraft(a)}
                  onClose={() => setShowAircraftModal(false)}
                />
              )}
              {showAudit && (
                <AuditLogs onClose={() => setShowAudit(false)} />
              )}
              {showHealth && (
                <HealthMetricsPanel onClose={() => setShowHealth(false)} />
              )}
            </>
          )}
          {activeTab === 'volumemanager' && (
            <VolumeManager 
              volumes={volumes} 
              aircraft={aircraft} 
              onOpenVolume={addVolume} 
              onCloseVolume={closeVolume}
              onUpdateVolume={async (id, operatorId, payload) => {
                const updated = await apiPutWithHeaders<Volume>(`/api/volumes/${id}`, payload, { aircompany: operatorId });
                updateVolumeLocal(id, updated as any);
              }}
              onSetClosedLocal={(id, patch) => {
                updateVolumeLocal(id, patch as any);
              }}
            />
          )}
          {activeTab === 'flightlog' && (
            <FlightLogBook 
              logs={logs} 
              aircraft={aircraft} 
              activeVolume={activeVolume}
              onAddLog={addFlightLog} 
              onDeleteLog={deleteFlightLog}
            />
          )}
          {activeTab === 'maintenance' && (
            <MaintenanceManager 
              tasks={tasks} 
              components={components} 
              onAddWorkOrder={(wo) => console.log("Nova OS", wo)} 
              onDeleteTask={deleteTask}
              onDeleteComponent={deleteComponent}
            />
          )}
          {activeTab === 'components' && (
            <ComponentsManager 
              components={components} 
              onAddComponent={addComponent} 
              onUpdateComponent={updateComponent}
              onDeleteComponent={deleteComponent}
            />
          )}
          {activeTab === 'compliance' && (
            <ComplianceManager 
              aircraft={aircraft}
              complianceItems={complianceItems}
              onAddCompliance={addComplianceItem}
              onDeleteCompliance={deleteComplianceItem}
            />
          )}
        </div>
        </div>
      </main>
    </div>
    </AppStateProvider>
  );
};

export default App;
