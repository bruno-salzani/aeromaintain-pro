
import React from 'react';
import { Aircraft, Component, MaintenanceStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DashboardProps {
  aircraft: Aircraft;
  components: Component[];
}

const Dashboard: React.FC<DashboardProps> = ({ aircraft, components }) => {
  const expiredCount = components.filter(c => c.status === MaintenanceStatus.VENCIDO).length;
  const criticalCount = components.filter(c => c.status === MaintenanceStatus.CRITICO || (c.remainingHours && c.remainingHours < 50)).length;

  const chartData = components.slice(0, 5).map(c => ({
    name: c.description.substring(0, 15),
    remaining: c.remainingHours || 0,
    status: c.status
  }));

  const iamDaysRemaining = Math.ceil((new Date(aircraft.nextIAMDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const isIamCritical = iamDaysRemaining < 15;

  return (
    <div className="space-y-6">
      {/* Alerta Crítico de Aeronavegabilidade */}
      {(expiredCount > 0 || isIamCritical) && (
        <div className="bg-red-600 text-white p-4 rounded-xl flex items-center justify-between shadow-lg animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <i className="fas fa-plane-slash text-xl"></i>
            </div>
            <div>
              <p className="font-black uppercase text-sm tracking-widest leading-none">Aeronave Impedida (AOG)</p>
              <p className="text-xs font-bold text-red-100 mt-1">Existem itens de manutenção vencidos ou CVA expirado conforme RBAC 91.</p>
            </div>
          </div>
          <button className="bg-white text-red-600 px-4 py-1.5 rounded-lg font-black text-[10px] uppercase shadow-md">
            Ver Discrepâncias
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 -mr-8 -mt-8 rounded-full transition-transform group-hover:scale-110"></div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest relative z-10">Total Flight Hours</p>
          <p className="text-3xl font-black text-slate-800 mt-1 relative z-10">{aircraft.totalHours.toFixed(1)} <span className="text-sm font-bold text-slate-300">FH</span></p>
          <div className="mt-3 w-full h-1 bg-gray-50 rounded-full">
            <div className="w-2/3 h-full bg-blue-500 rounded-full"></div>
          </div>
        </div>
        <div className="card p-6">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Cycles</p>
          <p className="text-3xl font-black text-indigo-600 mt-1">{aircraft.totalCycles} <span className="text-sm font-bold text-indigo-200 uppercase">Cyc</span></p>
          <p className="text-[10px] font-bold text-gray-400 mt-2">Média: {(aircraft.totalHours / (aircraft.totalCycles || 1)).toFixed(1)} FH/CYC</p>
        </div>
        <div className={`p-6 rounded-xl shadow-sm border transition-all ${isIamCritical ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
          <p className={`text-[10px] font-black uppercase tracking-widest ${isIamCritical ? 'text-red-500' : 'text-gray-400'}`}>Próximo CVA / IAM</p>
          <p className={`text-xl font-black mt-1 ${isIamCritical ? 'text-red-700' : 'text-slate-800'}`}>{new Date(aircraft.nextIAMDate).toLocaleDateString('pt-BR')}</p>
          <p className={`text-[10px] font-bold mt-2 ${isIamCritical ? 'text-red-400' : 'text-gray-400'}`}>
            {iamDaysRemaining > 0 ? `Vence em ${iamDaysRemaining} dias` : 'EXPIRADO'}
          </p>
        </div>
        <div className={`p-6 rounded-xl shadow-sm border transition-all ${expiredCount > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <p className={`text-[10px] font-black uppercase tracking-widest ${expiredCount > 0 ? 'text-red-500' : 'text-green-500'}`}>Status de Frota</p>
          <p className={`text-xl font-black mt-1 ${expiredCount > 0 ? 'text-red-700' : 'text-green-700'}`}>
            {expiredCount > 0 ? 'AOG / VENCIDO' : 'OPERACIONAL'}
          </p>
          <div className="mt-2 flex items-center gap-1">
             <span className={`w-2 h-2 rounded-full ${expiredCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></span>
             <span className="text-[10px] font-bold text-slate-500">{expiredCount} ITENS PENDENTES</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold uppercase text-slate-700 tracking-widest">Componentes com Vida Limitada (LLC)</h3>
            <button className="btn-muted uppercase text-[10px]">Ver Todos</button>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="2 2" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} style={{ fontSize: '10px', fontWeight: 'bold' }} />
                <Tooltip 
                  cursor={{fill: 'transparent'}} 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                />
                <Bar dataKey="remaining" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.remaining < 0 ? '#ef4444' : entry.remaining < 50 ? '#f59e0b' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6 flex flex-col">
          <h3 className="text-sm font-black uppercase text-slate-600 tracking-widest mb-4">Alertas de Auditoria</h3>
          <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {components.filter(c => c.status !== MaintenanceStatus.OK).map(c => (
              <div key={c.id} className={`p-4 rounded-xl border-l-4 shadow-sm transition-all hover:translate-x-1 ${c.status === MaintenanceStatus.VENCIDO ? 'border-red-500 bg-red-50/30' : 'border-yellow-500 bg-yellow-50/30'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-black text-slate-800 text-xs uppercase">{c.description}</p>
                    <p className="text-[9px] text-slate-400 font-bold mt-0.5">ATA {c.ata} • S/N {c.sn}</p>
                  </div>
                </div>
                {c.remainingHours !== undefined && (
                  <div className="mt-3 flex items-center justify-between">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${c.status === MaintenanceStatus.VENCIDO ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {c.status}
                    </span>
                    <p className="text-[10px] font-black text-slate-600">
                      {c.remainingHours < 0 ? `${Math.abs(c.remainingHours)} FH OVER` : `${c.remainingHours.toFixed(1)} FH REM`}
                    </p>
                  </div>
                )}
              </div>
            ))}
            {components.filter(c => c.status !== MaintenanceStatus.OK).length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 opacity-40">
                <i className="fas fa-check-double text-4xl text-green-500 mb-2"></i>
                <p className="text-xs font-bold text-slate-500">Frota sem discrepâncias de manutenção.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
