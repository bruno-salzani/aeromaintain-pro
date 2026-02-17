
import React, { useState } from 'react';
import { ComplianceItem, Aircraft } from '../types';

interface Props {
  aircraft: Aircraft;
  complianceItems: ComplianceItem[];
  onAddCompliance: (item: Omit<ComplianceItem, 'id'>) => void;
  onDeleteCompliance: (id: string) => void;
}

const ComplianceManager: React.FC<Props> = ({ aircraft, complianceItems, onAddCompliance, onDeleteCompliance }) => {
  const [showForm, setShowForm] = useState(false);
  const [newItem, setNewItem] = useState<Omit<ComplianceItem, 'id'>>({
    type: 'DA',
    referenceNumber: '',
    description: '',
    applicableTo: 'Célula',
    ata: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    status: 'PENDENTE',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddCompliance(newItem);
    setShowForm(false);
    setNewItem({
      type: 'DA',
      referenceNumber: '',
      description: '',
      applicableTo: 'Célula',
      ata: '',
      effectiveDate: new Date().toISOString().split('T')[0],
      status: 'PENDENTE',
      notes: ''
    });
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'CUMPRIDA': return 'bg-green-100 text-green-700 border-green-200';
      case 'PENDENTE': return 'bg-red-100 text-red-700 border-red-200';
      case 'REPETITIVA': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-xl font-bold">Conformidade e Aeronavegabilidade</h2>
          <p className="text-gray-500 text-sm tracking-tight">Monitoramento de DAs (ANAC), ADs (FAA/EASA) e Boletins de Serviço (SB).</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition shadow-md flex items-center gap-2"
        >
          <i className={`fas ${showForm ? 'fa-times' : 'fa-plus'}`}></i>
          <span>{showForm ? 'Cancelar' : 'Nova Diretriz/Boletim'}</span>
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-lg border-2 border-indigo-50 animate-in slide-in-from-top-4 duration-300">
          <h3 className="text-lg font-bold mb-6 text-indigo-900 flex items-center gap-2">
            <i className="fas fa-shield-halved"></i> Registrar Item de Conformidade
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Tipo</label>
              <select value={newItem.type} onChange={e => setNewItem({...newItem, type: e.target.value as any})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500">
                <option value="DA">DA (ANAC)</option>
                <option value="AD">AD (Estrangeira)</option>
                <option value="SB">Boletim de Serviço (SB)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Nº de Referência</label>
              <input type="text" required value={newItem.referenceNumber} onChange={e => setNewItem({...newItem, referenceNumber: e.target.value.toUpperCase()})} className="w-full p-2 border rounded-lg" placeholder="ex: 2024-03-01" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Capítulo ATA</label>
              <input type="text" required value={newItem.ata} onChange={e => setNewItem({...newItem, ata: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="ex: 32" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Aplicabilidade</label>
              <select value={newItem.applicableTo} onChange={e => setNewItem({...newItem, applicableTo: e.target.value})} className="w-full p-2 border rounded-lg">
                <option value="Célula">Célula</option>
                <option value="Motor">Motor</option>
                <option value="Hélice">Hélice</option>
                <option value="Aviônicos">Aviônicos</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 mb-1">Descrição do Requisito</label>
              <input type="text" required value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="Descreva o que deve ser feito..." />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Status de Cumprimento</label>
              <select value={newItem.status} onChange={e => setNewItem({...newItem, status: e.target.value as any})} className="w-full p-2 border rounded-lg">
                <option value="PENDENTE">Pendente</option>
                <option value="CUMPRIDA">Cumprida</option>
                <option value="REPETITIVA">Repetitiva (Periódica)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Vencimento (Horas)</label>
              <input type="number" value={newItem.nextDueHours || ''} onChange={e => setNewItem({...newItem, nextDueHours: parseInt(e.target.value) || undefined})} className="w-full p-2 border rounded-lg" placeholder="FH" />
            </div>
          </div>
          <div className="mt-8 flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 text-gray-500 font-bold">Descartar</button>
            <button type="submit" className="bg-indigo-600 text-white px-8 py-2 rounded-lg font-bold shadow-lg transform transition hover:scale-105">
              Gravar no Registro de Aeronavegabilidade
            </button>
          </div>
        </form>
      )}

      <div className="card overflow-hidden">
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-widest">Controle de Diretrizes de Aeronavegabilidade (DA/AD)</h3>
          <div className="flex gap-2">
            <span className="badge-danger">
              {complianceItems.filter(i => i.status === 'PENDENTE').length} PENDENTES
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs font-bold text-gray-600 uppercase tracking-widest bg-gray-50/50">
                <th className="px-6 py-4">Ref / Tipo</th>
                <th className="px-6 py-4">ATA</th>
                <th className="px-6 py-4">Descrição / Aplicabilidade</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Próximo Vencimento</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {complianceItems.map(item => (
                <tr key={item.id} className="hover:bg-indigo-50/30 transition group">
                  <td className="px-6 py-4">
                    <p className="text-sm font-black text-slate-800">{item.referenceNumber}</p>
                    <span className="text-[10px] font-bold text-indigo-500 uppercase">{item.type}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">CH {item.ata}</span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-700">{item.description}</p>
                    <p className="text-[10px] text-slate-400 font-medium italic uppercase mt-0.5">Aplicado a: {item.applicableTo}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[9px] px-2 py-1 rounded-full font-black border uppercase tracking-wider ${getStatusStyle(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {item.nextDueHours ? (
                      <p className="text-sm font-bold text-slate-600">{item.nextDueHours} FH</p>
                    ) : item.nextDueDate ? (
                      <p className="text-sm font-bold text-slate-600">{new Date(item.nextDueDate).toLocaleDateString()}</p>
                    ) : (
                      <span className="text-xs text-slate-300 font-medium">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button className="p-2 text-slate-400 hover:text-indigo-600 transition"><i className="fas fa-edit"></i></button>
                      <button onClick={() => {
                        if (window.confirm('Excluir este registro de conformidade?')) onDeleteCompliance(item.id);
                      }} className="p-2 text-slate-400 hover:text-red-500 transition"><i className="fas fa-trash-alt"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
              {complianceItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center">
                      <i className="fas fa-shield-halved text-4xl mb-3 opacity-20"></i>
                      <p className="text-sm font-bold">Nenhuma DA/SB registrada para esta aeronave.</p>
                    </div>
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

export default ComplianceManager;
