import React, { useState } from 'react';
import { Aircraft } from '@/types';
import { apiPut } from '@/services/api';

interface Props {
  aircraft: Aircraft;
  onSaveLocal: (a: Aircraft) => void;
  onClose: () => void;
}

const AircraftModal: React.FC<Props> = ({ aircraft, onSaveLocal, onClose }) => {
  const [form, setForm] = useState<Aircraft>({ ...aircraft });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      onSaveLocal(form);
      try {
        await apiPut<Aircraft>('/api/aircraft', form);
      } catch (e) { void e; }
      onClose();
    } catch (e: any) {
      setError('Falha ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-6 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-card border border-gray-100" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-widest">Cadastro de Aeronave</h3>
          <div className="flex gap-2">
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition" aria-label="Fechar" title="Fechar">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {error && <div className="badge-danger">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">Matrícula</label>
              <input className="w-full p-2 border rounded-lg text-sm bg-white" value={form.registration} onChange={e => setForm({ ...form, registration: e.target.value })} required />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">Modelo</label>
              <input className="w-full p-2 border rounded-lg text-sm bg-white" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} required />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">MSN</label>
              <input className="w-full p-2 border rounded-lg text-sm bg-white" value={form.msn} onChange={e => setForm({ ...form, msn: e.target.value })} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">Ano Fabricação</label>
              <input type="number" className="w-full p-2 border rounded-lg text-sm bg-white" value={form.manufactureYear} onChange={e => setForm({ ...form, manufactureYear: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">Total Hours</label>
              <input type="number" className="w-full p-2 border rounded-lg text-sm bg-white" value={form.totalHours} onChange={e => setForm({ ...form, totalHours: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">Total Cycles</label>
              <input type="number" className="w-full p-2 border rounded-lg text-sm bg-white" value={form.totalCycles} onChange={e => setForm({ ...form, totalCycles: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">Próxima IAM</label>
              <input type="date" className="w-full p-2 border rounded-lg text-sm bg-white" value={form.nextIAMDate} onChange={e => setForm({ ...form, nextIAMDate: e.target.value })} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">Validade CA</label>
              <input type="date" className="w-full p-2 border rounded-lg text-sm bg-white" value={form.validityCA} onChange={e => setForm({ ...form, validityCA: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AircraftModal;
