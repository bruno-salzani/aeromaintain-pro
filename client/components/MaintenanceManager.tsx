
import React, { useState } from 'react';
import { MaintenanceTask, Component, WorkOrder, WOStatus, MaintenanceStatus } from '../types';
import { extractMaintenanceFromPdf } from '../services/geminiService';

interface Props {
  tasks: MaintenanceTask[];
  components: Component[];
  onAddWorkOrder: (wo: WorkOrder) => void;
  onDeleteTask: (id: string) => void;
  onDeleteComponent: (id: string) => void;
}

const MaintenanceManager: React.FC<Props> = ({ tasks, components, onAddWorkOrder, onDeleteTask, onDeleteComponent }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus('Analyzing report with Gemini AI...');

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const result = await extractMaintenanceFromPdf(base64);
        console.log("Extracted items:", result);
        setImportStatus(`Successfully extracted ${result.length} items.`);
      } catch (err) {
        setImportStatus('Error analyzing file.');
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const confirmDeleteTask = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta tarefa de manutenção?')) {
      onDeleteTask(id);
    }
  };

  const confirmDeleteComponent = (id: string) => {
    if (window.confirm('Tem certeza que deseja remover este componente da aeronave?')) {
      onDeleteComponent(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 card p-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Maintenance Planning</h2>
          <p className="text-gray-600 text-sm">Manage scheduled tasks and airworthiness directives.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="flex-1 md:flex-none flex items-center justify-center gap-2 btn-primary cursor-pointer">
            <i className="fas fa-file-import"></i>
            <span>Import PDF Report</span>
            <input type="file" className="hidden" accept="application/pdf" onChange={handleFileUpload} />
          </label>
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 btn-success">
            <i className="fas fa-plus"></i>
            <span>New Work Order</span>
          </button>
        </div>
      </div>

      {isImporting && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-center gap-3">
          <i className="fas fa-circle-notch fa-spin text-blue-600"></i>
          <span className="text-blue-700 font-medium">{importStatus}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
            <h3 className="font-bold text-gray-700 uppercase text-sm tracking-widest">Pending Tasks (Scheduled)</h3>
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold">{tasks.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-semibold text-gray-600 uppercase bg-gray-50/30">
                  <th className="px-6 py-3">ATA</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tasks.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 transition group">
                    <td className="px-6 py-4 text-sm font-medium text-gray-600">{t.ata}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-800">
                      {t.description}
                      {t.isComplianceItem && <span className="ml-2 text-[8px] px-1 py-0.5 rounded bg-red-100 text-red-600 font-black uppercase">AD/SB</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button 
                        onClick={(e) => { e.stopPropagation(); confirmDeleteTask(t.id); }} 
                        className="text-gray-400 hover:text-red-500 transition-colors p-2"
                        title="Excluir tarefa"
                      >
                         <i className="fas fa-trash-alt"></i>
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
            <h3 className="font-bold text-gray-700 uppercase text-sm tracking-widest">Life Tracking (LLC)</h3>
            <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-bold">{components.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-semibold text-gray-500 uppercase bg-gray-50/30">
                  <th className="px-6 py-3">P/N & S/N</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {components.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition group">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-gray-800">{c.pn}</p>
                      <p className="text-xs text-gray-500">{c.sn}</p>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-700">{c.description}</td>
                    <td className="px-6 py-4 text-right">
                       <button 
                        onClick={(e) => { e.stopPropagation(); confirmDeleteComponent(c.id); }} 
                        className="text-gray-400 hover:text-red-500 transition-colors p-2"
                        title="Remover componente"
                      >
                         <i className="fas fa-trash-alt"></i>
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceManager;
