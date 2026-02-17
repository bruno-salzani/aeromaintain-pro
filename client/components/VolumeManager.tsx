
import React, { useState } from 'react';
import { Volume, Aircraft } from '../types';
import { apiPutWithHeaders, apiGetWithHeaders, apiGet } from '@/services/api';

interface Props {
  volumes: Volume[];
  aircraft: Aircraft;
  onOpenVolume: (volume: Omit<Volume, 'id'>) => void;
  onCloseVolume: (id: string, observations: string) => void;
  onUpdateVolume?: (id: string, operatorId: string, payload: any) => Promise<void> | void;
  onSetClosedLocal?: (id: string, patch: Partial<Volume>) => void;
}

const VolumeManager: React.FC<Props> = ({ volumes, aircraft, onOpenVolume, onCloseVolume, onUpdateVolume, onSetClosedLocal }) => {
  const [showOpenForm, setShowOpenForm] = useState(false);
  const [newVolume, setNewVolume] = useState({
    numeroVolume: `01/${aircraft.registration}/${new Date().getFullYear()}`,
    dataAbertura: new Date().toISOString().split('T')[0],
    minutosTotaisVooInicio: Math.floor(aircraft.totalHours * 60),
    totalPousosInicio: aircraft.totalCycles, // Approximating landings with cycles
    totalCiclosCelulaInicio: aircraft.totalCycles,
    observacoesAbertura: '',
    horasVooMotor1: '',
    horasVooMotor2: '',
    ciclosMotor1: '',
    ciclosMotor2: ''
  });

  const activeVolume = volumes.find(v => v.status === 'ABERTO');

  const handleOpen = (e: React.FormEvent) => {
    e.preventDefault();
    onOpenVolume({
      ...newVolume,
      matriculaAeronave: aircraft.registration,
      horasVooMotor: {
        '1': newVolume.horasVooMotor1,
        '2': newVolume.horasVooMotor2
      },
      ciclosMotor: {
        '1': newVolume.ciclosMotor1,
        '2': newVolume.ciclosMotor2
      },
      autoClose: true,
      status: 'ABERTO'
    });
    setShowOpenForm(false);
  };

  const [showEditForm, setShowEditForm] = useState(false);
  const [operatorId, setOperatorId] = useState('');
  const [updatePayload, setUpdatePayload] = useState({
    numeroVolume: '',
    minutosTotaisVoo: 0,
    totalPousos: 0,
    totalCiclosCelula: 0,
    observacoesTermoDeAbertura: '',
    horasVooMotor1: '',
    horasVooMotor2: '',
    ciclosMotor1: '',
    ciclosMotor2: ''
  });
  const [successMsg, setSuccessMsg] = useState('');
  const [anacLoadedEdit, setAnacLoadedEdit] = useState(false);

  const startEdit = () => {
    if (!activeVolume) return;
    setShowEditForm(true);
    setOperatorId(activeVolume.anacOperatorIds?.[0] || '');
    setUpdatePayload({
      numeroVolume: activeVolume.numeroVolume || '',
      minutosTotaisVoo: activeVolume.minutosTotaisVooInicio || 0,
      totalPousos: activeVolume.totalPousosInicio || 0,
      totalCiclosCelula: activeVolume.totalCiclosCelulaInicio || 0,
      observacoesTermoDeAbertura: activeVolume.observacoesAbertura || '',
      horasVooMotor1: activeVolume.horasVooMotor?.['1'] || '',
      horasVooMotor2: activeVolume.horasVooMotor?.['2'] || '',
      ciclosMotor1: activeVolume.ciclosMotor?.['1'] || '',
      ciclosMotor2: activeVolume.ciclosMotor?.['2'] || ''
    });
    if (activeVolume.anacVolumeId) {
      apiGetWithHeaders(`/api/volumes/${activeVolume.id}/anac`, { aircompany: activeVolume.anacOperatorIds?.[0] || '' })
        .then((data: any) => {
          setUpdatePayload(prev => ({
            ...prev,
            numeroVolume: String(data.numeroVolume ?? prev.numeroVolume),
            observacoesTermoDeAbertura: String(data.observacoesTermoDeAbertura ?? prev.observacoesTermoDeAbertura)
          }));
          setAnacLoadedEdit(true);
        })
        .catch(() => {});
    }
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVolume) return;
    const payload = {
      numeroVolume: updatePayload.numeroVolume,
      minutosTotaisVoo: updatePayload.minutosTotaisVoo,
      totalPousos: updatePayload.totalPousos,
      totalCiclosCelula: updatePayload.totalCiclosCelula,
      observacoesTermoDeAbertura: updatePayload.observacoesTermoDeAbertura || undefined,
      horasVooMotor: {
        ...(updatePayload.horasVooMotor1 ? { '1': updatePayload.horasVooMotor1 } : {}),
        ...(updatePayload.horasVooMotor2 ? { '2': updatePayload.horasVooMotor2 } : {})
      },
      ciclosMotor: {
        ...(updatePayload.ciclosMotor1 ? { '1': updatePayload.ciclosMotor1 } : {}),
        ...(updatePayload.ciclosMotor2 ? { '2': updatePayload.ciclosMotor2 } : {})
      }
    };
    try {
      if (onUpdateVolume) {
        await onUpdateVolume(activeVolume.id, operatorId, payload);
      } else {
        await apiPutWithHeaders(`/api/volumes/${activeVolume.id}`, payload as any, { aircompany: operatorId });
      }
      setSuccessMsg('A alteração foi efetivada com sucesso');
      setTimeout(() => setSuccessMsg(''), 4000);
      setShowEditForm(false);
    } catch (err) {
      alert('Falha ao atualizar o volume');
    }
  };

  const [showCloseForm, setShowCloseForm] = useState(false);
  const [closeOperatorId, setCloseOperatorId] = useState('');
  const [closePayload, setClosePayload] = useState({
    dataFechamentoVolume: '',
    minutosTotaisVoo: 0,
    totalPousos: 0,
    totalCiclosCelula: 0,
    observacoesTermoDeFechamento: '',
    horasVooMotor1: '',
    horasVooMotor2: '',
    ciclosMotor1: '',
    ciclosMotor2: ''
  });
  const [closeSuccessMsg, setCloseSuccessMsg] = useState('');
  const [closeErrors, setCloseErrors] = useState<{ horas1?: string; horas2?: string; ciclos1?: string; ciclos2?: string }>({});
  const [showPayloadSummary, setShowPayloadSummary] = useState(true);
  const [anacLoadedClose, setAnacLoadedClose] = useState(false);
  const [qNrMatricula, setQNrMatricula] = useState('');
  const [qVolumeId, setQVolumeId] = useState('');
  const [qNrVolume, setQNrVolume] = useState('');
  const [qLoading, setQLoading] = useState(false);
  const [qError, setQError] = useState('');
  const [qResults, setQResults] = useState<any[]>([]);
  const [qFilter, setQFilter] = useState<'all' | 'open' | 'closed'>('all');

  const startClose = () => {
    if (!activeVolume) return;
    setShowCloseForm(true);
    setCloseOperatorId(activeVolume.anacOperatorIds?.[0] || '');
    const today = new Date();
    const isoDate = today.toISOString().split('T')[0];
    setClosePayload({
      dataFechamentoVolume: isoDate,
      minutosTotaisVoo: activeVolume.minutosTotaisVooInicio || 0,
      totalPousos: activeVolume.totalPousosInicio || 0,
      totalCiclosCelula: activeVolume.totalCiclosCelulaInicio || 0,
      observacoesTermoDeFechamento: '',
      horasVooMotor1: activeVolume.horasVooMotor?.['1'] || '',
      horasVooMotor2: activeVolume.horasVooMotor?.['2'] || '',
      ciclosMotor1: activeVolume.ciclosMotor?.['1'] || '',
      ciclosMotor2: activeVolume.ciclosMotor?.['2'] || ''
    });
    if (activeVolume.anacVolumeId) {
      apiGetWithHeaders(`/api/volumes/${activeVolume.id}/anac`, { aircompany: activeVolume.anacOperatorIds?.[0] || '' })
        .then((data: any) => {
          setClosePayload(prev => ({
            ...prev,
            minutosTotaisVoo: Number(data.minutosTotaisVoo ?? prev.minutosTotaisVoo),
            totalPousos: Number(data.totalPousos ?? prev.totalPousos),
            totalCiclosCelula: Number(data.totalCiclosCelula ?? prev.totalCiclosCelula),
            horasVooMotor1: data.horasVooMotor?.['1'] ?? prev.horasVooMotor1,
            horasVooMotor2: data.horasVooMotor?.['2'] ?? prev.horasVooMotor2,
            ciclosMotor1: data.ciclosMotor?.['1'] ?? prev.ciclosMotor1,
            ciclosMotor2: data.ciclosMotor?.['2'] ?? prev.ciclosMotor2,
            observacoesTermoDeFechamento: data.observacoesTermoDeFechamento ?? prev.observacoesTermoDeFechamento
          }));
          setUpdatePayload(prev => ({
            ...prev,
            numeroVolume: String(data.numeroVolume ?? prev.numeroVolume)
          }));
          setAnacLoadedClose(true);
        })
        .catch(() => {});
    }
  };

  function toHourMinute(h: number) {
    const hours = Math.floor(Number(h) || 0);
    const minutes = Math.round(((Number(h) || 0) - hours) * 60);
    return `${String(hours).padStart(1, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  async function queryAnacVolumes() {
    setQError('');
    setQLoading(true);
    try {
      const params = new URLSearchParams();
      if (qNrMatricula) params.set('nrMatricula', qNrMatricula);
      if (qVolumeId) params.set('volumeId', qVolumeId);
      if (qNrVolume) params.set('nrVolume', qNrVolume);
      const list = await apiGet<any[]>(`/api/volumes/anac?${params.toString()}`);
      setQResults(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setQError(e?.message || 'Falha na consulta');
      setQResults([]);
    } finally {
      setQLoading(false);
    }
  }

  function loadFromQuery(item: any) {
    const minutos = Number(item.qtMinutoTotalFim ?? item.qtMinutoTotalInicio ?? 0);
    const pousos = Number(item.qtPousoTotalFim ?? item.qtPousoTotalInicio ?? 0);
    const ciclos = Number(item.qtCicloTotalFim ?? item.qtCicloTotalInicio ?? 0);
    const motores = Array.isArray(item.motorVolumes) ? item.motorVolumes : [];
    const h1 = motores[0]?.quantidadeHoraFinalMotor ?? motores[0]?.quantidadeHoraInicialMotor ?? undefined;
    const h2 = motores[1]?.quantidadeHoraFinalMotor ?? motores[1]?.quantidadeHoraInicialMotor ?? undefined;
    const c1 = motores[0]?.cicloMotorFinal ?? motores[0]?.cicloMotorInicial ?? undefined;
    const c2 = motores[1]?.cicloMotorFinal ?? motores[1]?.cicloMotorInicial ?? undefined;
    setClosePayload(prev => ({
      ...prev,
      minutosTotaisVoo: minutos,
      totalPousos: pousos,
      totalCiclosCelula: ciclos,
      horasVooMotor1: h1 != null ? toHourMinute(Number(h1)) : prev.horasVooMotor1,
      horasVooMotor2: h2 != null ? toHourMinute(Number(h2)) : prev.horasVooMotor2,
      ciclosMotor1: c1 != null ? String(c1) : prev.ciclosMotor1,
      ciclosMotor2: c2 != null ? String(c2) : prev.ciclosMotor2,
      observacoesTermoDeFechamento: String(item.dsObservacoesTermoDeFechamento ?? prev.observacoesTermoDeFechamento)
    }));
    setUpdatePayload(prev => ({
      ...prev,
      numeroVolume: String(item.nrVolume ?? prev.numeroVolume)
    }));
    setAnacLoadedClose(true);
  }

  function applyObservationsFromQuery(item: any) {
    setUpdatePayload(prev => ({
      ...prev,
      observacoesTermoDeAbertura: String(item.dsObservacoesTermoDeAbertura ?? prev.observacoesTermoDeAbertura)
    }));
    setClosePayload(prev => ({
      ...prev,
      observacoesTermoDeFechamento: String(item.dsObservacoesTermoDeFechamento ?? prev.observacoesTermoDeFechamento)
    }));
  }

  function dateIsoToBr(iso: string) {
    if (!iso) return '';
    const d = new Date(iso);
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = d.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  function dateBrToIso(br: string) {
    const [dd, mm, yyyy] = br.split('/');
    return new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`).toISOString();
  }

  const submitClose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVolume) return;
    const hourRegex = /^\d{1,6}:\d{2}$/;
    const digitRegex = /^\d+$/;
    const errs: any = {};
    if (closePayload.horasVooMotor1 && !hourRegex.test(closePayload.horasVooMotor1)) errs.horas1 = 'Formato HHHHHH:MM';
    if (closePayload.horasVooMotor2 && !hourRegex.test(closePayload.horasVooMotor2)) errs.horas2 = 'Formato HHHHHH:MM';
    if (closePayload.ciclosMotor1 && !digitRegex.test(closePayload.ciclosMotor1)) errs.ciclos1 = 'Apenas dígitos';
    if (closePayload.ciclosMotor2 && !digitRegex.test(closePayload.ciclosMotor2)) errs.ciclos2 = 'Apenas dígitos';
    setCloseErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const payload = {
      dataFechamentoVolume: /^\d{4}-\d{2}-\d{2}$/.test(closePayload.dataFechamentoVolume)
        ? dateIsoToBr(closePayload.dataFechamentoVolume)
        : closePayload.dataFechamentoVolume,
      minutosTotaisVoo: closePayload.minutosTotaisVoo,
      totalPousos: closePayload.totalPousos,
      totalCiclosCelula: closePayload.totalCiclosCelula,
      observacoesTermoDeFechamento: closePayload.observacoesTermoDeFechamento || undefined,
      horasVooMotor: {
        ...(closePayload.horasVooMotor1 ? { '1': closePayload.horasVooMotor1 } : {}),
        ...(closePayload.horasVooMotor2 ? { '2': closePayload.horasVooMotor2 } : {})
      },
      ciclosMotor: {
        ...(closePayload.ciclosMotor1 ? { '1': closePayload.ciclosMotor1 } : {}),
        ...(closePayload.ciclosMotor2 ? { '2': closePayload.ciclosMotor2 } : {})
      }
    };
    if (!window.confirm('Confirmar envio do payload de fechamento para ANAC?')) {
      return;
    }
    try {
      await apiPutWithHeaders(`/api/volumes/${activeVolume.id}/close`, payload as any, { aircompany: closeOperatorId });
      const iso = /^\d{4}-\d{2}-\d{2}$/.test(closePayload.dataFechamentoVolume)
        ? new Date(closePayload.dataFechamentoVolume).toISOString()
        : dateBrToIso(closePayload.dataFechamentoVolume);
      onSetClosedLocal?.(activeVolume.id, {
        status: 'FECHADO',
        dataFechamento: iso,
        observacoesFechamento: closePayload.observacoesTermoDeFechamento
      } as any);
      setCloseSuccessMsg('Volume fechado com sucesso');
      setTimeout(() => setCloseSuccessMsg(''), 4000);
      setShowCloseForm(false);
    } catch (err) {
      alert('Falha ao fechar o volume');
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center card p-6">
        <div>
          <h2 className="text-xl font-bold">Gerenciamento de Volumes (ANAC DBE)</h2>
          <p className="text-gray-500 text-sm">O volume é o caderno oficial de registros. Apenas um volume pode estar aberto.</p>
        </div>
        {!activeVolume && !showOpenForm && (
          <button 
            onClick={() => setShowOpenForm(true)}
            className="btn-primary flex items-center gap-2"
          >
            <i className="fas fa-plus"></i> Abrir Novo Volume
          </button>
        )}
        {activeVolume && (
          <div className="flex items-center gap-3">
            <button onClick={startEdit} className="btn-secondary flex items-center gap-2">
              <i className="fas fa-pen"></i> Editar Volume
            </button>
            <button onClick={startClose} className="btn-danger flex items-center gap-2">
              <i className="fas fa-lock"></i> Fechar Volume (Admin)
            </button>
          </div>
        )}
      </div>

      {showOpenForm && (
        <form onSubmit={handleOpen} className="card p-8 border-2 border-blue-50 animate-in zoom-in-95 duration-200">
          <h3 className="text-lg font-bold mb-6 text-blue-900">Termo de Abertura de Volume</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Número do Volume</label>
              <input type="text" required value={newVolume.numeroVolume} onChange={e => setNewVolume({...newVolume, numeroVolume: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="01/PT-XXX/2025" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Data de Abertura</label>
              <input type="date" required value={newVolume.dataAbertura} onChange={e => setNewVolume({...newVolume, dataAbertura: e.target.value})} className="w-full p-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Minutos Totais (Acumulado)</label>
              <input type="number" required value={newVolume.minutosTotaisVooInicio} onChange={e => setNewVolume({...newVolume, minutosTotaisVooInicio: parseInt(e.target.value)})} className="w-full p-2 border rounded-lg" />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-bold text-gray-700 mb-1">Observações de Abertura</label>
            <textarea value={newVolume.observacoesAbertura} onChange={e => setNewVolume({...newVolume, observacoesAbertura: e.target.value})} className="w-full p-2 border rounded-lg" rows={3}></textarea>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Horas Motor 1 (HHHHHH:MM)</label>
              <input type="text" value={newVolume.horasVooMotor1} onChange={e => setNewVolume({...newVolume, horasVooMotor1: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="150:00" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Horas Motor 2 (HHHHHH:MM)</label>
              <input type="text" value={newVolume.horasVooMotor2} onChange={e => setNewVolume({...newVolume, horasVooMotor2: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="90:00" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Ciclos Motor 1</label>
              <input type="text" value={newVolume.ciclosMotor1} onChange={e => setNewVolume({...newVolume, ciclosMotor1: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="100" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Ciclos Motor 2</label>
              <input type="text" value={newVolume.ciclosMotor2} onChange={e => setNewVolume({...newVolume, ciclosMotor2: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="50" />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={() => setShowOpenForm(false)} className="px-6 py-2 text-gray-500">Cancelar</button>
            <button type="submit" className="bg-blue-600 text-white px-8 py-2 rounded-lg font-bold shadow-lg">Confirmar Abertura</button>
          </div>
        </form>
      )}

      {activeVolume && (
        <div className="card p-6 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
              <h3 className="text-lg font-bold text-green-800">Volume Atual Aberto: {activeVolume.numeroVolume}</h3>
            </div>
            <p className="text-green-700 text-sm mt-1">Iniciado em {new Date(activeVolume.dataAbertura).toLocaleDateString()} com {activeVolume.minutosTotaisVooInicio} minutos totais.</p>
          </div>
          <button 
            onClick={() => {
              const obs = window.prompt("Observações para o fechamento:");
              if (obs !== null) onCloseVolume(activeVolume.id, obs);
            }}
            className="btn-danger"
          >
            Fechar Volume
          </button>
        </div>
      )}

      {showEditForm && activeVolume && (
        <form onSubmit={submitEdit} className="card p-8 border-2 border-amber-50 animate-in zoom-in-95 duration-200">
          <h3 className="text-lg font-bold mb-6 text-amber-900 flex items-center gap-2">
            <i className="fas fa-gear"></i> Alteração de Volume (Admin)
          </h3>
          {anacLoadedEdit && (
            <div className="mb-3 text-[11px] font-bold text-green-700 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Valores carregados da ANAC
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Operador (aircompany)</label>
              {activeVolume.anacOperatorIds?.length ? (
                <select value={operatorId} onChange={e => setOperatorId(e.target.value)} className="w-full p-2 border rounded-lg">
                  {activeVolume.anacOperatorIds.map(id => (
                    <option key={id} value={id}>{id}</option>
                  ))}
                </select>
              ) : (
                <input type="text" value={operatorId} onChange={e => setOperatorId(e.target.value)} className="w-full p-2 border rounded-lg" placeholder="ID do Operador" />
              )}
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Número do Volume</label>
              <input type="text" required value={updatePayload.numeroVolume} onChange={e => setUpdatePayload({...updatePayload, numeroVolume: e.target.value})} className="w-full p-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Minutos Totais</label>
              <input type="number" required value={updatePayload.minutosTotaisVoo} onChange={e => setUpdatePayload({...updatePayload, minutosTotaisVoo: parseInt(e.target.value) || 0})} className="w-full p-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Total de Pousos</label>
              <input type="number" required value={updatePayload.totalPousos} onChange={e => setUpdatePayload({...updatePayload, totalPousos: parseInt(e.target.value) || 0})} className="w-full p-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Total de Ciclos (Célula)</label>
              <input type="number" required value={updatePayload.totalCiclosCelula} onChange={e => setUpdatePayload({...updatePayload, totalCiclosCelula: parseInt(e.target.value) || 0})} className="w-full p-2 border rounded-lg" />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-bold text-gray-700 mb-1">Observações de Abertura</label>
            <textarea value={updatePayload.observacoesTermoDeAbertura} onChange={e => setUpdatePayload({...updatePayload, observacoesTermoDeAbertura: e.target.value})} className="w-full p-2 border rounded-lg" rows={3}></textarea>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Horas Motor 1 (HHHHHH:MM)</label>
              <input type="text" value={updatePayload.horasVooMotor1} onChange={e => setUpdatePayload({...updatePayload, horasVooMotor1: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="150:00" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Horas Motor 2 (HHHHHH:MM)</label>
              <input type="text" value={updatePayload.horasVooMotor2} onChange={e => setUpdatePayload({...updatePayload, horasVooMotor2: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="90:00" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Ciclos Motor 1</label>
              <input type="text" value={updatePayload.ciclosMotor1} onChange={e => setUpdatePayload({...updatePayload, ciclosMotor1: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="100" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Ciclos Motor 2</label>
              <input type="text" value={updatePayload.ciclosMotor2} onChange={e => setUpdatePayload({...updatePayload, ciclosMotor2: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="50" />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={() => setShowEditForm(false)} className="px-6 py-2 text-gray-500">Cancelar</button>
            <button type="submit" className="bg-amber-600 text-white px-8 py-2 rounded-lg font-bold shadow-lg">Salvar Alterações</button>
          </div>
          {successMsg && (
            <div className="mt-4 bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg flex items-center gap-2">
              <i className="fas fa-check-circle"></i>
              <span className="font-medium">{successMsg}</span>
            </div>
          )}
        </form>
      )}

      {showCloseForm && activeVolume && (
        <form onSubmit={submitClose} className="card p-8 border-2 border-red-50 animate-in zoom-in-95 duration-200">
          <h3 className="text-lg font-bold mb-6 text-red-900 flex items-center gap-2">
            <i className="fas fa-lock"></i> Fechamento de Volume (Admin)
          </h3>
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-[11px] font-black uppercase text-blue-700 tracking-widest mb-2">Consulta de Volumes na ANAC</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input type="text" value={qNrMatricula} onChange={e => setQNrMatricula(e.target.value)} className="p-2 border rounded-lg" placeholder="nrMatricula (PRXXX)" />
              <input type="text" value={qVolumeId} onChange={e => setQVolumeId(e.target.value)} className="p-2 border rounded-lg" placeholder="volumeId (1111)" />
              <input type="text" value={qNrVolume} onChange={e => setQNrVolume(e.target.value)} className="p-2 border rounded-lg" placeholder="nrVolume (02/PR-XXX/2025)" />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button type="button" onClick={queryAnacVolumes} className="btn-secondary">
                {qLoading ? 'Buscando...' : 'Buscar'}
              </button>
              {qError && <span className="text-[11px] text-red-600">{qError}</span>}
              <div className="ml-auto flex items-center gap-2">
                <button type="button" onClick={() => setQFilter('all')} className={`text-[11px] px-2 py-1 rounded font-bold ${qFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'}`}>Todos</button>
                <button type="button" onClick={() => setQFilter('open')} className={`text-[11px] px-2 py-1 rounded font-bold ${qFilter === 'open' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700'}`}>Abertos</button>
                <button type="button" onClick={() => setQFilter('closed')} className={`text-[11px] px-2 py-1 rounded font-bold ${qFilter === 'closed' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700'}`}>Fechados</button>
              </div>
            </div>
            {qResults.length > 0 && (
              <div className="mt-3">
                <div className="text-[10px] uppercase font-black text-slate-400">Resultados</div>
                <ul className="divide-y divide-blue-100 mt-1">
                  {qResults
                    .filter(it => qFilter === 'all' ? true : qFilter === 'closed' ? Boolean(it.dtTermoDeFechamento) : !it.dtTermoDeFechamento)
                    .map((it, idx) => (
                    <li key={idx} className="py-2 flex items-center justify-between gap-3">
                      <div className="text-sm">
                        <div className="font-bold text-slate-800">{it.nrVolume} <span className="text-xs text-slate-500">#{it.volumeId}</span></div>
                        <div className="text-xs text-slate-600">Matrícula: {it.diarioBordoAeronave?.nrMatricula}</div>
                        <div className="text-xs">
                          {it.dtTermoDeFechamento ? (
                            <span className="text-[10px] px-2 py-1 rounded-full font-bold border bg-gray-100 text-gray-600 border-gray-200">Fechado</span>
                          ) : (
                            <span className="text-[10px] px-2 py-1 rounded-full font-bold border bg-green-100 text-green-700 border-green-200">Aberto</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" className="btn-secondary" onClick={() => loadFromQuery(it)}>Carregar no fechamento</button>
                        <button type="button" className="btn-secondary" onClick={() => applyObservationsFromQuery(it)}>Aplicar observações</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {anacLoadedClose && (
            <div className="mb-3 text-[11px] font-bold text-green-700 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Valores carregados da ANAC
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Operador (aircompany)</label>
              {activeVolume.anacOperatorIds?.length ? (
                <select value={closeOperatorId} onChange={e => setCloseOperatorId(e.target.value)} className="w-full p-2 border rounded-lg">
                  {activeVolume.anacOperatorIds.map(id => (
                    <option key={id} value={id}>{id}</option>
                  ))}
                </select>
              ) : (
                <input type="text" value={closeOperatorId} onChange={e => setCloseOperatorId(e.target.value)} className="w-full p-2 border rounded-lg" placeholder="ID do Operador" />
              )}
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Data de Fechamento</label>
              <input type="date" required value={closePayload.dataFechamentoVolume} onChange={e => setClosePayload({...closePayload, dataFechamentoVolume: e.target.value})} className="w-full p-2 border rounded-lg" />
              <p className="text-[10px] text-slate-400 mt-1">Será enviado em formato DD/MM/YYYY para a ANAC</p>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Minutos Totais</label>
              <input type="number" required value={closePayload.minutosTotaisVoo} onChange={e => setClosePayload({...closePayload, minutosTotaisVoo: parseInt(e.target.value) || 0})} className="w-full p-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Total de Pousos</label>
              <input type="number" required value={closePayload.totalPousos} onChange={e => setClosePayload({...closePayload, totalPousos: parseInt(e.target.value) || 0})} className="w-full p-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Total de Ciclos (Célula)</label>
              <input type="number" required value={closePayload.totalCiclosCelula} onChange={e => setClosePayload({...closePayload, totalCiclosCelula: parseInt(e.target.value) || 0})} className="w-full p-2 border rounded-lg" />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-bold text-gray-700 mb-1">Observações de Fechamento</label>
            <textarea value={closePayload.observacoesTermoDeFechamento} onChange={e => setClosePayload({...closePayload, observacoesTermoDeFechamento: e.target.value})} className="w-full p-2 border rounded-lg" rows={3}></textarea>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Horas Motor 1 (HHHHHH:MM)</label>
              <input type="text" value={closePayload.horasVooMotor1} onChange={e => setClosePayload({...closePayload, horasVooMotor1: e.target.value})} className={`w-full p-2 border rounded-lg ${closeErrors.horas1 ? 'border-red-400' : ''}`} placeholder="150:00" />
              {closeErrors.horas1 && <p className="text-[10px] text-red-500 mt-1">{closeErrors.horas1}</p>}
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Horas Motor 2 (HHHHHH:MM)</label>
              <input type="text" value={closePayload.horasVooMotor2} onChange={e => setClosePayload({...closePayload, horasVooMotor2: e.target.value})} className={`w-full p-2 border rounded-lg ${closeErrors.horas2 ? 'border-red-400' : ''}`} placeholder="90:00" />
              {closeErrors.horas2 && <p className="text-[10px] text-red-500 mt-1">{closeErrors.horas2}</p>}
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Ciclos Motor 1</label>
              <input type="text" value={closePayload.ciclosMotor1} onChange={e => setClosePayload({...closePayload, ciclosMotor1: e.target.value})} className={`w-full p-2 border rounded-lg ${closeErrors.ciclos1 ? 'border-red-400' : ''}`} placeholder="100" />
              {closeErrors.ciclos1 && <p className="text-[10px] text-red-500 mt-1">{closeErrors.ciclos1}</p>}
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Ciclos Motor 2</label>
              <input type="text" value={closePayload.ciclosMotor2} onChange={e => setClosePayload({...closePayload, ciclosMotor2: e.target.value})} className={`w-full p-2 border rounded-lg ${closeErrors.ciclos2 ? 'border-red-400' : ''}`} placeholder="50" />
              {closeErrors.ciclos2 && <p className="text-[10px] text-red-500 mt-1">{closeErrors.ciclos2}</p>}
            </div>
          </div>
          <div className="mt-6">
            <button type="button" onClick={() => setShowPayloadSummary(s => !s)} className="text-xs text-slate-600 font-bold hover:underline">
              {showPayloadSummary ? 'Ocultar' : 'Exibir'} Resumo do Payload
            </button>
            {showPayloadSummary && (
              <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Resumo do Payload</div>
                <pre className="text-[11px] text-slate-700 mt-2 overflow-auto max-h-48">{JSON.stringify({
                  dataFechamentoVolume: /^\d{4}-\d{2}-\d{2}$/.test(closePayload.dataFechamentoVolume)
                    ? dateIsoToBr(closePayload.dataFechamentoVolume)
                    : closePayload.dataFechamentoVolume,
                  minutosTotaisVoo: closePayload.minutosTotaisVoo,
                  totalPousos: closePayload.totalPousos,
                  totalCiclosCelula: closePayload.totalCiclosCelula,
                  observacoesTermoDeFechamento: closePayload.observacoesTermoDeFechamento || undefined,
                  horasVooMotor: {
                    ...(closePayload.horasVooMotor1 ? { '1': closePayload.horasVooMotor1 } : {}),
                    ...(closePayload.horasVooMotor2 ? { '2': closePayload.horasVooMotor2 } : {})
                  },
                  ciclosMotor: {
                    ...(closePayload.ciclosMotor1 ? { '1': closePayload.ciclosMotor1 } : {}),
                    ...(closePayload.ciclosMotor2 ? { '2': closePayload.ciclosMotor2 } : {})
                  },
                  header: { aircompany: closeOperatorId }
                }, null, 2)}</pre>
              </div>
            )}
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={() => setShowCloseForm(false)} className="px-6 py-2 text-gray-500">Cancelar</button>
            <button type="submit" className="bg-red-600 text-white px-8 py-2 rounded-lg font-bold shadow-lg">Confirmar Fechamento</button>
          </div>
          {closeSuccessMsg && (
            <div className="mt-4 bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg flex items-center gap-2">
              <i className="fas fa-check-circle"></i>
              <span className="font-medium">{closeSuccessMsg}</span>
            </div>
          )}
        </form>
      )}

      <div className="card overflow-hidden">
        <div className="p-4 border-b bg-gray-50 font-bold text-gray-700 uppercase text-xs tracking-widest flex items-center justify-between">
          <span>Histórico de Volumes</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500">Filtrar por matrícula</span>
            <select
              className="p-2 border rounded-lg text-sm"
              value={qNrMatricula}
              onChange={e => setQNrMatricula(e.target.value)}
            >
              <option value="">Todas</option>
              {[...new Set(volumes.map(v => v.matriculaAeronave).filter(Boolean))].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 text-[10px] uppercase text-gray-400 font-black">
            <tr>
              <th className="px-6 py-4">Número / Data</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Horas Início</th>
              <th className="px-6 py-4">Data Fechamento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(qNrMatricula ? volumes.filter(v => v.matriculaAeronave === qNrMatricula) : volumes).map(v => (
              <tr key={v.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4">
                  <p className="font-bold text-slate-800">{v.numeroVolume}</p>
                  <p className="text-xs text-slate-500">{new Date(v.dataAbertura).toLocaleDateString()}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold border ${v.status === 'ABERTO' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {v.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{(v.minutosTotaisVooInicio / 60).toFixed(1)} FH</td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {v.dataFechamento ? new Date(v.dataFechamento).toLocaleDateString() : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VolumeManager;
