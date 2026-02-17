
import React, { useState } from 'react';
import { Component, MaintenanceStatus } from '../types';

interface Props {
  components: Component[];
  onAddComponent: (component: Omit<Component, 'id'>) => void;
  onUpdateComponent: (id: string, component: Partial<Component>) => void;
  onDeleteComponent: (id: string) => void;
}

const ComponentsManager: React.FC<Props> = ({ components, onAddComponent, onUpdateComponent, onDeleteComponent }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formState, setFormState] = useState<Omit<Component, 'id'>>({
    aircraftId: 'pt-gav-id',
    pn: '',
    sn: '',
    description: '',
    installedDate: new Date().toISOString().split('T')[0],
    installedHours: 0,
    installedCycles: 0,
    lifeLimitHours: undefined,
    lifeLimitCycles: undefined,
    calendarLimitDays: undefined,
    remainingHours: undefined,
    status: MaintenanceStatus.OK,
    ata: ''
  });

  const filtered = components.filter(c => 
    c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.pn.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.sn.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.ata.includes(searchTerm)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      onUpdateComponent(editingId, formState);
    } else {
      onAddComponent(formState);
    }
    resetForm();
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingId(null);
    setFormState({
      aircraftId: 'pt-gav-id',
      pn: '',
      sn: '',
      description: '',
      installedDate: new Date().toISOString().split('T')[0],
      installedHours: 0,
      installedCycles: 0,
      status: MaintenanceStatus.OK,
      ata: ''
    });
  };

  const startEdit = (c: Component) => {
    setEditingId(c.id);
    setFormState({
      aircraftId: c.aircraftId,
      pn: c.pn,
      sn: c.sn,
      description: c.description,
      installedDate: c.installedDate,
      installedHours: c.installedHours,
      installedCycles: c.installedCycles,
      lifeLimitHours: c.lifeLimitHours,
      lifeLimitCycles: c.lifeLimitCycles,
      calendarLimitDays: c.calendarLimitDays,
      remainingHours: c.remainingHours,
      status: c.status,
      ata: c.ata
    });
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmDelete = (id: string, description: string) => {
    if (window.confirm(`ATENÇÃO: Deseja realmente remover permanentemente o componente "${description}" do inventário? Esta ação não pode ser desfeita.`)) {
      onDeleteComponent(id);
    }
  };

  const getStatusColor = (status: MaintenanceStatus) => {
    switch (status) {
      case MaintenanceStatus.OK: return 'bg-green-100 text-green-700 border-green-200';
      case MaintenanceStatus.VENCIDO: return 'bg-red-100 text-red-700 border-red-200';
      case MaintenanceStatus.CRITICO: return 'bg-orange-100 text-orange-700 border-orange-200';
      case MaintenanceStatus.EM_MANUTENCAO: return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 card p-6">
        <div>
          <h2 className="text-xl font-bold">Inventário de Componentes</h2>
          <p className="text-gray-500 text-sm">Controle de peças com vida limitada e estoque.</p>
        </div>
        <button 
          onClick={() => showAddForm ? resetForm() : setShowAddForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <i className={`fas ${showAddForm ? 'fa-times' : 'fa-plus'}`}></i>
          <span>{showAddForm ? 'Fechar' : 'Adicionar Componente'}</span>
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="card p-8 border-2 border-indigo-50 animate-in zoom-in-95 duration-200">
          <h3 className="text-lg font-bold mb-6 text-indigo-900 flex items-center gap-2">
            <i className="fas fa-boxes"></i> {editingId ? 'Editar Componente' : 'Novo Registro de Componente'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-1">Descrição</label>
              <input type="text" required value={formState.description} onChange={e => setFormState({...formState, description: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="ex: Starter Generator" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Capítulo ATA</label>
              <input type="text" required value={formState.ata} onChange={e => setFormState({...formState, ata: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="ex: 24" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Data de Instalação</label>
              <input type="date" required value={formState.installedDate} onChange={e => setFormState({...formState, installedDate: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Part Number (P/N)</label>
              <input type="text" required value={formState.pn} onChange={e => setFormState({...formState, pn: e.target.value.toUpperCase()})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Serial Number (S/N)</label>
              <input type="text" required value={formState.sn} onChange={e => setFormState({...formState, sn: e.target.value.toUpperCase()})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Limite de Vida (FH)</label>
              <input type="number" value={formState.lifeLimitHours || ''} onChange={e => setFormState({...formState, lifeLimitHours: parseInt(e.target.value) || undefined})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Opcional" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Horas na Instalação</label>
              <input type="number" value={formState.installedHours} onChange={e => setFormState({...formState, installedHours: parseInt(e.target.value) || 0})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>
          <div className="mt-8 flex justify-end gap-3">
            <button type="button" onClick={resetForm} className="px-6 py-2 rounded-lg font-bold text-gray-500 hover:bg-gray-100 transition">Cancelar</button>
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2 rounded-lg font-bold shadow-lg transition transform hover:scale-105">
              {editingId ? 'Atualizar Componente' : 'Registrar no Inventário'}
            </button>
          </div>
        </form>
      )}

      <div className="card">
        <div className="p-4 border-b flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input 
              type="text" 
              placeholder="Filtrar por P/N, S/N, ATA ou Descrição..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            />
          </div>
          <div className="flex gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase">Exibindo {filtered.length} de {components.length} componentes</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50">
                <th className="px-6 py-4">Detalhes do Componente</th>
                <th className="px-6 py-4">ATA</th>
                <th className="px-6 py-4">Status de Vida</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-100 transition">
                        <i className="fas fa-microchip"></i>
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 leading-none">{c.description}</p>
                        <div className="flex gap-2 mt-2">
                          <span className="text-[10px] font-bold text-gray-400 px-1.5 py-0.5 border rounded uppercase tracking-tighter">P/N: {c.pn}</span>
                          <span className="text-[10px] font-bold text-gray-400 px-1.5 py-0.5 border rounded uppercase tracking-tighter">S/N: {c.sn}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-sm font-black text-slate-600">CH {c.ata}</span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between w-32">
            <span className="text-xs text-gray-500 font-semibold">Restante:</span>
            <span className={`text-xs font-bold ${c.remainingHours && c.remainingHours < 50 ? 'text-red-600' : 'text-slate-800'}`}>
                          {c.remainingHours !== undefined ? `${c.remainingHours.toFixed(1)} FH` : 'Ilimitado'}
                        </span>
                      </div>
                      {c.lifeLimitHours && (
                        <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                className={`h-full rounded-full ${c.remainingHours && c.remainingHours < 50 ? 'bg-red-500' : 'bg-indigo-600'}`} 
                            style={{ width: `${Math.max(0, Math.min(100, ((c.remainingHours || 0) / c.lifeLimitHours) * 100))}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
        <span className={`text-xs px-2.5 py-1 rounded-full font-bold border uppercase tracking-wider ${getStatusColor(c.status)}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); startEdit(c); }}
                        className="p-3 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" 
                        title="Editar Componente"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); confirmDelete(c.id, c.description); }}
                        className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" 
                        title="Excluir Componente"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-gray-400">
                    <i className="fas fa-search mb-4 text-4xl block opacity-20"></i>
                    Nenhum componente encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ComponentsManager;
