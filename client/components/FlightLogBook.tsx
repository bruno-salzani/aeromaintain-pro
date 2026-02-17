
import React, { useState } from 'react';
import { z } from 'zod';
import { FlightLog, Aircraft, Volume, Aeronauta } from '../types';
import { apiPost, apiDelete, apiPut } from '@/services/api';
import { ResponsiveContainer, LineChart, Line } from 'recharts';
const track = (event: string, payload: any = {}) => {
  const reqId = Math.random().toString(36).slice(2);
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, reqId, ua: navigator.userAgent, payload }));
};
const useActionMessage = () => {
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const set = (m: { type: 'success' | 'error'; text: string }) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 3000);
  };
  return { actionMessage: msg, setActionMessage: set };
};

interface Props {
  logs: FlightLog[];
  aircraft: Aircraft;
  activeVolume?: Volume;
  onAddLog: (log: Omit<FlightLog, 'id'>) => void;
  onDeleteLog: (id: string) => void;
}

const FUNCOES_ANAC = [
  { id: '1', label: 'Piloto em comando (P1)' },
  { id: '2', label: 'Piloto em comando adicional (P2)' },
  { id: '3', label: 'Piloto em instrução (I1)' },
  { id: '7', label: 'Copiloto dual pilot (O3)' },
  { id: '8', label: 'Instrutor de voo (V1)' },
  { id: '9', label: 'Aluno piloto (V2)' },
  { id: '11', label: 'Comissário (C)' },
  { id: '12', label: 'Mecânico de voo (M)' }
];

const NATUREZA_VOO = [
  { id: '1', label: 'Autorização especial' },
  { id: '4', label: 'Voo não regular' },
  { id: '5', label: 'Voo regular' },
  { id: '6', label: 'Caráter privado' },
  { id: '7', label: 'Serviço aéreo especializado' },
  { id: '8', label: 'Treinamento com instrutor' },
  { id: '10', label: 'Operação Aeromédica' }
];

const FlightLogBook: React.FC<Props> = ({ logs, aircraft, activeVolume, onAddLog, onDeleteLog }) => {
  const [showForm, setShowForm] = useState(false);
  const [showOnlyCiv, setShowOnlyCiv] = useState(false);
  const civCount = logs.filter(l => !!l.civClassification).length;
  const civTooltip = 'Etapas com classificação CIV (RECLASSIFY_SOLO ou TREINAMENTO_INSTRUTOR_ALUNO)';
  const [anacMetrics, setAnacMetrics] = useState<any | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  const fetchMetrics = async () => {
    try {
      setLoadingMetrics(true);
      const res = await fetch('/api/metrics/anac');
      const data = await res.json();
      setAnacMetrics(data);
    } catch {
      // ignore
    } finally {
      setLoadingMetrics(false);
    }
  };

  React.useEffect(() => {
    fetchMetrics();
  }, []);
  const [crew, setCrew] = useState<Aeronauta[]>([
    { aeronautaBrasileiro: true, numeroDocumento: '', funcao: '1', nome: '' }
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const setError = (field: string, message: string) => {
    setErrors(prev => {
      const next = { ...prev };
      if (message) next[field] = message; else delete next[field];
      return next;
    });
  };
  const [form, setForm] = useState<{
    naturezaVoo: string;
    siglaAerodromoDecolagem: string;
    latitudeDecolagem: string;
    longitudeDecolagem: string;
    localDecolagem: string;
    siglaAerodromoPouso: string;
    latitudePouso: string;
    longitudePouso: string;
    localPouso: string;
    horarioPartida: string;
    horarioDecolagem: string;
    horarioPouso: string;
    horarioCorteMotores: string;
    quantidadePessoasVoo: number;
    totalCombustivel: number;
    unidadeCombustivel: 'L' | 'KG';
    numeroPousoEtapa: number;
    numeroCicloEtapa: number;
  }>({
    naturezaVoo: '6',
    siglaAerodromoDecolagem: '',
    latitudeDecolagem: '',
    longitudeDecolagem: '',
    localDecolagem: '',
    siglaAerodromoPouso: '',
    latitudePouso: '',
    longitudePouso: '',
    localPouso: '',
    horarioPartida: '',
    horarioDecolagem: '',
    horarioPouso: '',
    horarioCorteMotores: '',
    quantidadePessoasVoo: 1,
    totalCombustivel: 0,
    unidadeCombustivel: 'L',
    numeroPousoEtapa: 1,
    numeroCicloEtapa: 1
  });

  const validateIcao = (field: 'siglaAerodromoDecolagem' | 'siglaAerodromoPouso', value: string) => {
    if (!value) return setError(field, '');
    const ok = /^[A-Z]{4}$/.test(value);
    setError(field, ok ? '' : 'ICAO inválido (4 letras A–Z)');
  };

  const validateCoord = (field: 'latitudeDecolagem' | 'longitudeDecolagem' | 'latitudePouso' | 'longitudePouso', value: string) => {
    if (!value) return setError(field, '');
    const num = Number(value);
    const isLat = field.includes('latitude');
    const ok = Number.isFinite(num) && (isLat ? num >= -90 && num <= 90 : num >= -180 && num <= 180);
    setError(field, ok ? '' : isLat ? 'Latitude deve estar entre -90 e 90' : 'Longitude deve estar entre -180 e 180');
  };

  const validateDateTime = (field: 'horarioPartida' | 'horarioDecolagem' | 'horarioPouso' | 'horarioCorteMotores', value: string) => {
    if (!value) return setError(field, '');
    const ok = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value);
    setError(field, ok ? '' : 'Formato inválido, use YYYY-MM-DDTHH:MM');
    validateOrder();
  };

  const validatePositive = (field: 'quantidadePessoasVoo', value: number) => {
    const ok = Number.isFinite(value) && value >= 1;
    setError(field, ok ? '' : 'Deve ser pelo menos 1');
  };

  const validateNonNegative = (field: 'totalCombustivel', value: number) => {
    const ok = Number.isFinite(value) && value >= 0;
    setError(field, ok ? '' : 'Não pode ser negativo');
  };

  const validateOrder = () => {
    const toMs = (s: string) => s ? new Date(s).getTime() : null;
    const partida = toMs(form.horarioPartida);
    const decolagem = toMs(form.horarioDecolagem);
    const pouso = toMs(form.horarioPouso);
    const corte = toMs(form.horarioCorteMotores);
    if (partida && decolagem && partida > decolagem) {
      setError('horarioPartida', 'Partida deve ser anterior ou igual à Decolagem');
      setError('horarioDecolagem', 'Decolagem deve ser posterior ou igual à Partida');
    } else {
      setError('horarioPartida', '');
      setError('horarioDecolagem', '');
    }
    if (decolagem && pouso && decolagem > pouso) {
      setError('horarioDecolagem', 'Decolagem deve ser anterior ou igual ao Pouso');
      setError('horarioPouso', 'Pouso deve ser posterior ou igual à Decolagem');
    } else {
      if (!errors.horarioPartida) setError('horarioDecolagem', '');
      setError('horarioPouso', '');
    }
    if (pouso && corte && pouso > corte) {
      setError('horarioPouso', 'Pouso deve ser anterior ou igual ao Corte');
      setError('horarioCorteMotores', 'Corte deve ser posterior ou igual ao Pouso');
    } else {
      setError('horarioPouso', '');
      setError('horarioCorteMotores', '');
    }
    if (!pouso && partida && corte && partida > corte) {
      setError('horarioPartida', 'Partida deve ser anterior ou igual ao Corte');
      setError('horarioCorteMotores', 'Corte deve ser posterior ou igual à Partida');
    }
  };
  const timeOrderInvalid = React.useMemo(() => {
    return !!(errors.horarioPartida || errors.horarioDecolagem || errors.horarioPouso || errors.horarioCorteMotores);
  }, [errors]);
  const tempoPreview = React.useMemo(() => {
    const startIso = form.horarioDecolagem || form.horarioPartida;
    const endIso = form.horarioPouso || form.horarioCorteMotores;
    if (!startIso || !endIso || timeOrderInvalid) return '--:--';
    const departureDate = new Date(startIso);
    const arrivalDate = new Date(endIso);
    const diffMs = arrivalDate.getTime() - departureDate.getTime();
    if (diffMs < 0) return '--:--';
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor((diffMs % 3600000) / 60000);
    return `${String(diffHrs).padStart(2, '0')}:${String(diffMins).padStart(2, '0')}`;
  }, [form.horarioPartida, form.horarioDecolagem, form.horarioPouso, form.horarioCorteMotores, timeOrderInvalid]);

  const handleAddCrew = () => {
    setCrew([...crew, { aeronautaBrasileiro: true, numeroDocumento: '', funcao: '7', nome: '' }]);
  };

  const handleRemoveCrew = (index: number) => {
    setCrew(crew.filter((_, i) => i !== index));
  };

  const generateHash = (data: any) => {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'ANAC-DBE-' + Math.abs(hash).toString(16).toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVolume) return alert("É necessário um volume aberto para registrar voos.");
    if (timeOrderInvalid) {
      alert("Ordem temporal inválida. Ajuste os horários de Partida/Decolagem/Pouso/Corte.");
      return;
    }

    const startIso = form.horarioDecolagem || form.horarioPartida;
    const endIso = form.horarioPouso || form.horarioCorteMotores;
    const departureDate = new Date(startIso);
    const arrivalDate = new Date(endIso);
    const diffMs = arrivalDate.getTime() - departureDate.getTime();
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor((diffMs % 3600000) / 60000);
    const tempoVooTotal = `${String(diffHrs).padStart(2, '0')}:${String(diffMins).padStart(2, '0')}`;

    const newLogData = {
      ...form,
      volumeId: activeVolume.id,
      aeronautas: crew,
      tempoVooTotal,
      dataHorarioAssinaturaPiloto: new Date().toISOString(),
      dataHorarioAssinaturaOperador: new Date().toISOString(),
      isLocked: true,
      hashIntegridade: generateHash({ ...form, crew, tempoVooTotal }),
      blockTimeHours: diffMs / 3600000
    };

    const Schema = z.object({
      volumeId: z.string().min(1),
      naturezaVoo: z.enum(['1','2','4','5','6','7','8','10']),
      siglaAerodromoDecolagem: z.string().optional(),
      latitudeDecolagem: z.string().optional(),
      longitudeDecolagem: z.string().optional(),
      localDecolagem: z.string().optional(),
      siglaAerodromoPouso: z.string().optional(),
      latitudePouso: z.string().optional(),
      longitudePouso: z.string().optional(),
      localPouso: z.string().optional(),
      horarioPartida: z.string().min(1),
      horarioDecolagem: z.string().optional(),
      horarioPouso: z.string().optional(),
      horarioCorteMotores: z.string().min(1),
      tempoVooTotal: z.string().min(1),
      quantidadePessoasVoo: z.number().min(1),
      totalCombustivel: z.number().min(0.0001),
      unidadeCombustivel: z.enum(['L','KG']),
      numeroPousoEtapa: z.number().min(0),
      numeroCicloEtapa: z.number().min(0),
      aeronautas: z.array(z.object({
        aeronautaBrasileiro: z.boolean(),
        numeroDocumento: z.string().min(3),
        nome: z.string().optional(),
        funcao: z.enum(['1','2','3','7','8','9','11','12']),
        horarioApresentacao: z.string().optional()
      })).min(1)
    }).superRefine((val, ctx) => {
      const originIdentified = !!(val.siglaAerodromoDecolagem && val.siglaAerodromoDecolagem.trim().length === 4)
        || (!!val.latitudeDecolagem && !!val.longitudeDecolagem)
        || (!!val.localDecolagem && val.localDecolagem.trim().length);
      if (!originIdentified) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['siglaAerodromoDecolagem'], message: 'Origem requer ICAO ou (lat+long) ou local' });
      }
      const destIdentified = !!(val.siglaAerodromoPouso && val.siglaAerodromoPouso.trim().length === 4)
        || (!!val.latitudePouso && !!val.longitudePouso)
        || (!!val.localPouso && val.localPouso.trim().length);
      if (val.numeroPousoEtapa > 0 && !destIdentified) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['siglaAerodromoPouso'], message: 'Destino requer ICAO ou (lat+long) ou local' });
      }
      if (val.numeroPousoEtapa > 0) {
        if (!val.horarioDecolagem) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['horarioDecolagem'], message: 'Decolagem obrigatória quando há pouso' });
        if (!val.horarioPouso) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['horarioPouso'], message: 'Pouso obrigatório quando há pouso' });
      }
    });
    const parsed = Schema.safeParse(newLogData);
    if (!parsed.success) {
      alert("Dados inválidos para a etapa. Verifique os campos e funções.");
      return;
    }
    const hasPilot = parsed.data.aeronautas.some(a => ['1','2','3','7','8'].includes(a.funcao));
    if (!hasPilot) {
      alert("Tripulação sem piloto. Funções válidas: P1/P2/I1/O3/V1.");
      return;
    }
    if (parsed.data.naturezaVoo === '8') {
      const hasInstrutor = parsed.data.aeronautas.some(a => a.funcao === '8');
      const hasAluno = parsed.data.aeronautas.some(a => a.funcao === '3' || a.funcao === '9');
      if (!hasInstrutor || !hasAluno) {
        alert("Treinamento requer instrutor (V1) e aluno (I1/V2).");
        return;
      }
    }
    try {
      const created = await apiPost<FlightLog>('/api/logs', newLogData);
      onAddLog(created as any);
    } catch {
      onAddLog(newLogData as any);
    }
    setShowForm(false);
  };

  const { actionMessage, setActionMessage } = useActionMessage();
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center card p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
            <i className="fas fa-file-contract text-xl"></i>
          </div>
          <div>
            <h2 className="text-xl font-bold">Etapas de Voo (ANAC DBE)</h2>
            <div className="flex items-center gap-2">
              <span className="bg-blue-600 text-[10px] text-white px-1.5 py-0.5 rounded font-black">PADRÃO RES. 458</span>
              <p className="text-gray-500 text-sm">Registro eletrônico oficial de {aircraft.registration}.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
          onClick={() => setShowForm(!showForm)}
          disabled={!activeVolume}
          className={`btn-primary ${!activeVolume ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <i className={`fas ${showForm ? 'fa-times' : 'fa-plus'}`}></i>
          <span>{showForm ? 'Cancelar' : 'Registrar Etapa'}</span>
        </button>
        <span
          className="text-[9px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-black border border-amber-200 uppercase tracking-tighter flex items-center gap-1 w-fit"
          title={civTooltip}
        >
          <i className="fas fa-id-card-clip text-[8px]"></i> CIV {civCount}
        </span>
        <button 
          type="button"
          onClick={() => setShowOnlyCiv(!showOnlyCiv)}
          className={`ml-2 text-xs px-3 py-2 rounded-lg border ${showOnlyCiv ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-white text-slate-600 border-slate-200'}`}
          title="Mostrar apenas etapas com classificação CIV"
        >
          <i className="fas fa-filter mr-1"></i> {showOnlyCiv ? 'CIV apenas' : 'Todas'}
        </button>
        </div>
      </div>

      {!activeVolume && !showForm && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-800 text-sm flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
             <i className="fas fa-triangle-exclamation text-amber-600"></i>
          </div>
          <div>
            <p className="font-bold">Aeronave sem Volume Ativo</p>
            <p>De acordo com o RBAC 91, o Diário de Bordo deve possuir um Volume aberto para operação. Vá em "Diário de Bordo" e realize a abertura.</p>
          </div>
        </div>
      )}

      <div className="card p-6">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
            <i className="fas fa-chart-line text-blue-500"></i> Métricas ANAC (recentes)
          </h3>
          <button onClick={fetchMetrics} className="text-xs text-blue-600 font-bold hover:underline">{loadingMetrics ? '...' : 'Atualizar'}</button>
        </div>
        {!anacMetrics && (
          <p className="text-xs text-gray-400 mt-2">Sem métricas carregadas.</p>
        )}
        {anacMetrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            {[
              { key: 'getAccessToken', label: 'Token' },
              { key: 'openVolume', label: 'Abrir Volume' },
              { key: 'closeVolume', label: 'Fechar Volume' },
              { key: 'postFlight', label: 'Etapa' }
            ].map(m => (
              <div key={m.key} className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{m.label}</div>
                <div className="mt-1 flex items-center gap-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-black border border-slate-200">A {anacMetrics[m.key]?.attempts || 0}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-black border border-green-200">S {anacMetrics[m.key]?.successes || 0}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-black border border-red-200">F {anacMetrics[m.key]?.failures || 0}</span>
                </div>
                <div className="mt-2 h-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={[0,1,2,3,4].map(i => ({ x: i, y: anacMetrics[m.key]?.lastDurationMs || 0 }))}
                      margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                    >
                      <Line type="monotone" dataKey="y" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-[9px] text-slate-400 mt-1">
                  Última: {anacMetrics[m.key]?.lastDurationMs || 0}ms • {anacMetrics[m.key]?.lastAt ? new Date(anacMetrics[m.key].lastAt).toLocaleTimeString() : '-'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {actionMessage && (
        <div className={`badge ${actionMessage.type === 'error' ? 'badge-danger' : 'badge-success'}`}>{actionMessage.text}</div>
      )}
      {showForm && (
        <form onSubmit={handleSubmit} className="card p-8 border-2 border-blue-50 animate-in fade-in slide-in-from-top-4 duration-300 space-y-8">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-800 text-sm">
            <div className="flex items-center gap-2 font-bold mb-2">
              <i className="fas fa-circle-info"></i>
              Etapa de Voo
            </div>
            <p>
              A etapa de voo compreende os voos e ocorrências no período entre o acionamento e o corte dos motores (quando existirem), ou o período entre a decolagem e pouso da aeronave (como por exemplo num planador). O registro de uma etapa inclui a origem e destino da aeronave, dados de duração do voo sob diferentes condições, dados sobre a tripulação, dados sobre passageiros e carga transportados, dados sobre ocorrências a bordo, e dados relacionados à manutenção e utilização da aeronave.
            </p>
          </div>
          <section>
            <h3 className="text-sm font-black uppercase text-gray-400 tracking-widest mb-4 flex items-center gap-2">
              <i className="fas fa-info-circle text-blue-500"></i> Dados Gerais da Etapa
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1">Natureza do Voo (Cód. ANAC)</label>
                <select value={form.naturezaVoo} onChange={e => setForm({...form, naturezaVoo: e.target.value})} className="w-full p-2 border rounded-lg">
                  {NATUREZA_VOO.map(n => <option key={n.id} value={n.id}>{n.id} - {n.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-2">
                  Origem (ICAO)
                  <i className="fas fa-circle-info text-blue-500" title="Informe ICAO (4 letras) ou latitude+longitude ou um local."></i>
                </label>
                <input
                  type="text"
                  value={form.siglaAerodromoDecolagem}
                  onChange={e => {
                    const v = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
                    setForm({ ...form, siglaAerodromoDecolagem: v });
                    validateIcao('siglaAerodromoDecolagem', v);
                  }}
                  className="w-full p-2 border rounded-lg"
                  placeholder="SBBR"
                  maxLength={4}
                  pattern="[A-Z]{4}"
                  title="ICAO deve ter 4 letras (A-Z)"
                />
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <input type="text" value={form.latitudeDecolagem} onChange={e => { setForm({...form, latitudeDecolagem: e.target.value}); validateCoord('latitudeDecolagem', e.target.value); }} className={`w-full p-2 border ${errors.latitudeDecolagem ? 'border-red-500' : ''} rounded-lg text-xs`} placeholder="-23.55" inputMode="decimal" pattern="^-?\\d{1,3}(\\.\\d+)?$" title="Latitude decimal, ex.: -23.55" />
                  <input type="text" value={form.longitudeDecolagem} onChange={e => { setForm({...form, longitudeDecolagem: e.target.value}); validateCoord('longitudeDecolagem', e.target.value); }} className={`w-full p-2 border ${errors.longitudeDecolagem ? 'border-red-500' : ''} rounded-lg text-xs`} placeholder="-46.63" inputMode="decimal" pattern="^-?\\d{1,3}(\\.\\d+)?$" title="Longitude decimal, ex.: -46.63" />
                  <input type="text" value={form.localDecolagem} onChange={e => setForm({...form, localDecolagem: e.target.value})} className="w-full p-2 border rounded-lg text-xs" placeholder="Local" />
                </div>
                {errors.siglaAerodromoDecolagem && <p className="text-[10px] text-red-600 mt-1">{errors.siglaAerodromoDecolagem}</p>}
                {errors.latitudeDecolagem && <p className="text-[10px] text-red-600 mt-1">{errors.latitudeDecolagem}</p>}
                {errors.longitudeDecolagem && <p className="text-[10px] text-red-600 mt-1">{errors.longitudeDecolagem}</p>}
                <p className="text-[10px] text-slate-400 mt-1">Informe ICAO ou latitude+longitude ou um local.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-2">
                  Destino (ICAO)
                  <i className="fas fa-circle-info text-blue-500" title="Quando houver pouso, informe ICAO (4 letras) ou latitude+longitude ou um local."></i>
                </label>
                <input
                  type="text"
                  value={form.siglaAerodromoPouso}
                  onChange={e => {
                    const v = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
                    setForm({ ...form, siglaAerodromoPouso: v });
                    validateIcao('siglaAerodromoPouso', v);
                  }}
                  className="w-full p-2 border rounded-lg"
                  placeholder="SBGR"
                  maxLength={4}
                  pattern="[A-Z]{4}"
                  title="ICAO deve ter 4 letras (A-Z)"
                />
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <input type="text" value={form.latitudePouso} onChange={e => { setForm({...form, latitudePouso: e.target.value}); validateCoord('latitudePouso', e.target.value); }} className={`w-full p-2 border ${errors.latitudePouso ? 'border-red-500' : ''} rounded-lg text-xs`} placeholder="-23.55" inputMode="decimal" pattern="^-?\\d{1,3}(\\.\\d+)?$" title="Latitude decimal, ex.: -23.55" />
                  <input type="text" value={form.longitudePouso} onChange={e => { setForm({...form, longitudePouso: e.target.value}); validateCoord('longitudePouso', e.target.value); }} className={`w-full p-2 border ${errors.longitudePouso ? 'border-red-500' : ''} rounded-lg text-xs`} placeholder="-46.63" inputMode="decimal" pattern="^-?\\d{1,3}(\\.\\d+)?$" title="Longitude decimal, ex.: -46.63" />
                  <input type="text" value={form.localPouso} onChange={e => setForm({...form, localPouso: e.target.value})} className="w-full p-2 border rounded-lg text-xs" placeholder="Local" />
                </div>
                {errors.siglaAerodromoPouso && <p className="text-[10px] text-red-600 mt-1">{errors.siglaAerodromoPouso}</p>}
                {errors.latitudePouso && <p className="text-[10px] text-red-600 mt-1">{errors.latitudePouso}</p>}
                {errors.longitudePouso && <p className="text-[10px] text-red-600 mt-1">{errors.longitudePouso}</p>}
                <p className="text-[10px] text-slate-400 mt-1">Informe ICAO ou latitude+longitude ou um local.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Pessoas a bordo</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={form.quantidadePessoasVoo}
                    onChange={e => {
                      const v = Number(e.target.value);
                      setForm({ ...form, quantidadePessoasVoo: v });
                      validatePositive('quantidadePessoasVoo', v);
                    }}
                    className={`w-full p-2 border ${errors.quantidadePessoasVoo ? 'border-red-500' : ''} rounded-lg`}
                  />
                  {errors.quantidadePessoasVoo && <p className="text-[10px] text-red-600 mt-1">{errors.quantidadePessoasVoo}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Total de Combustível</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="0.01"
                    value={form.totalCombustivel}
                    onChange={e => {
                      const v = Number(e.target.value);
                      setForm({ ...form, totalCombustivel: v });
                      validateNonNegative('totalCombustivel', v);
                    }}
                    className={`w-full p-2 border ${errors.totalCombustivel ? 'border-red-500' : ''} rounded-lg`}
                  />
                  {errors.totalCombustivel && <p className="text-[10px] text-red-600 mt-1">{errors.totalCombustivel}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Unidade</label>
                <select required value={form.unidadeCombustivel} onChange={e => setForm({...form, unidadeCombustivel: e.target.value as 'L' | 'KG'})} className="w-full p-2 border rounded-lg">
                  <option value="L">L</option>
                  <option value="KG">KG</option>
                </select>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-black uppercase text-gray-400 tracking-widest mb-4 flex items-center gap-2">
              <i className="fas fa-clock text-blue-500"></i> Cronometria (UTC)
              <i className="fas fa-circle-info text-blue-500" title="Decolagem e Pouso são obrigatórios apenas quando numeroPousoEtapa &gt; 0; caso contrário, use Acionamento e Corte."></i>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Acionamento</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.horarioPartida}
                    onChange={e => { setForm({ ...form, horarioPartida: e.target.value }); validateDateTime('horarioPartida', e.target.value); }}
                    className={`w-full p-2 border ${errors.horarioPartida ? 'border-red-500' : ''} rounded-lg text-xs`}
                  />
                  {errors.horarioPartida && <p className="text-[10px] text-red-600 mt-1">{errors.horarioPartida}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Decolagem</label>
                  <input
                    type="datetime-local"
                    required={form.numeroPousoEtapa > 0}
                    value={form.horarioDecolagem}
                    onChange={e => { setForm({ ...form, horarioDecolagem: e.target.value }); validateDateTime('horarioDecolagem', e.target.value); }}
                    className={`w-full p-2 border ${errors.horarioDecolagem ? 'border-red-500' : ''} rounded-lg text-xs`}
                  />
                  {errors.horarioDecolagem && <p className="text-[10px] text-red-600 mt-1">{errors.horarioDecolagem}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Pouso</label>
                  <input
                    type="datetime-local"
                    required={form.numeroPousoEtapa > 0}
                    value={form.horarioPouso}
                    onChange={e => { setForm({ ...form, horarioPouso: e.target.value }); validateDateTime('horarioPouso', e.target.value); }}
                    className={`w-full p-2 border ${errors.horarioPouso ? 'border-red-500' : ''} rounded-lg text-xs`}
                  />
                  {errors.horarioPouso && <p className="text-[10px] text-red-600 mt-1">{errors.horarioPouso}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Corte</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.horarioCorteMotores}
                    onChange={e => { setForm({ ...form, horarioCorteMotores: e.target.value }); validateDateTime('horarioCorteMotores', e.target.value); }}
                    className={`w-full p-2 border ${errors.horarioCorteMotores ? 'border-red-500' : ''} rounded-lg text-xs`}
                  />
                  {errors.horarioCorteMotores && <p className="text-[10px] text-red-600 mt-1">{errors.horarioCorteMotores}</p>}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-black border border-slate-200">Tempo de Voo</span>
              <span className={`text-sm font-mono ${timeOrderInvalid ? 'text-red-600' : 'text-slate-600'}`}>{tempoPreview}</span>
              {!timeOrderInvalid && tempoPreview !== '--:--' && (
                <>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-black border border-green-200 flex items-center gap-1">
                    <i className="fas fa-check-circle"></i> OK
                  </span>
                  <span className="text-[10px] text-slate-600">
                    {(form.horarioDecolagem && form.horarioPouso) ? 'Decolagem→Pouso' : 'Partida→Corte'} = {tempoPreview}
                  </span>
                </>
              )}
              {timeOrderInvalid && (
                <span className="text-[10px] text-red-600">Ordem temporal inválida. Ajuste os horários.</span>
              )}
            </div>
          </section>

          <section>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                <i className="fas fa-users text-blue-500"></i> Tripulação Nominada
              </h3>
              <button type="button" onClick={handleAddCrew} className="text-xs text-blue-600 font-bold hover:underline">+ Adicionar Tripulante</button>
            </div>
            <div className="space-y-3">
              {crew.map((member, idx) => (
                <div key={idx} className="flex gap-3 items-end bg-slate-50 p-4 rounded-xl border border-slate-100 relative group transition-all hover:shadow-inner">
                  <div className="flex-1">
                    <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">CANAC / CPF</label>
                    <input type="text" required value={member.numeroDocumento} onChange={e => {
                      const newCrew = [...crew];
                      newCrew[idx].numeroDocumento = e.target.value;
                      setCrew(newCrew);
                    }} className="w-full p-2 border rounded-lg text-sm bg-white" placeholder="000000" />
                  </div>
                  <div className="flex-[2]">
                    <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">Nome Completo</label>
                    <input type="text" value={member.nome} onChange={e => {
                      const newCrew = [...crew];
                      newCrew[idx].nome = e.target.value;
                      setCrew(newCrew);
                    }} className="w-full p-2 border rounded-lg text-sm bg-white" placeholder="NOME DO TRIPULANTE" />
                  </div>
                  <div className="flex-[1.5]">
                    <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">Função a Bordo</label>
                    <select value={member.funcao} onChange={e => {
                      const newCrew = [...crew];
                      newCrew[idx].funcao = e.target.value;
                      setCrew(newCrew);
                    }} className="w-full p-2 border rounded-lg text-sm bg-white">
                      {FUNCOES_ANAC.map(f => <option key={f.id} value={f.id}>{f.id} - {f.label}</option>)}
                    </select>
                  </div>
                  {idx > 0 && (
                    <button type="button" onClick={() => handleRemoveCrew(idx)} className="p-2 text-red-400 hover:text-red-600">
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="bg-slate-900 p-6 rounded-xl text-white">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4">Declaração e Assinatura Digital</h3>
            <p className="text-[10px] text-slate-400 mb-4">Ao clicar em assinar, eu declaro para fins de direito que os dados acima são expressão da verdade e que a aeronave encontra-se em condições de aeronavegabilidade para a etapa operada.</p>
            <div className="flex justify-end pt-2">
              <button type="submit" disabled={timeOrderInvalid} className={`bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-xl font-black shadow-xl transition transform hover:scale-105 flex items-center gap-3 ${timeOrderInvalid ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <i className="fas fa-signature"></i>
                ASSINAR DIÁRIO E GRAVAR ETAPA
              </button>
            </div>
          </section>
        </form>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100">
            <tr>
              <th className="px-6 py-4">Data / Volume</th>
              <th className="px-6 py-4">Operação</th>
              <th className="px-6 py-4">Tripulação</th>
              <th className="px-6 py-4">Status / Integridade</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(showOnlyCiv ? logs.filter(l => !!l.civClassification) : logs).map(log => (
              <tr key={log.id} className="hover:bg-slate-50 transition group">
                <td className="px-6 py-4">
                  <p className="text-xs font-bold text-slate-700">{new Date(log.horarioDecolagem).toLocaleDateString()}</p>
                  <p className="text-[9px] text-slate-400 font-bold mt-0.5">VOL: {log.volumeId.substring(0, 8).toUpperCase()}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-blue-700 text-sm">{log.siglaAerodromoDecolagem}</span>
                    <i className="fas fa-arrow-right text-[10px] text-gray-300"></i>
                    <span className="font-black text-blue-700 text-sm">{log.siglaAerodromoPouso}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-1 rounded">NAT {log.naturezaVoo}</span>
                    <p className="text-[10px] font-bold text-slate-400">{log.tempoVooTotal} FH</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex -space-x-1.5">
                    {log.aeronautas.map((a, i) => (
                      <div key={i} title={`${a.funcao === '1' ? 'P1' : 'Crew'}: ${a.nome || a.numeroDocumento}`} className={`w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-black shadow-sm ${a.funcao === '1' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                        {a.funcao === '1' ? 'P1' : 'C'}
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                   <div className="space-y-1.5">
                     <span className="text-[9px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-black border border-green-200 uppercase tracking-tighter flex items-center gap-1 w-fit">
                       <i className="fas fa-lock text-[8px]"></i> IMUTÁVEL
                     </span>
                     {log.civClassification && (
                       <span
                         className="text-[9px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-black border border-amber-200 uppercase tracking-tighter flex items-center gap-1 w-fit"
                         title={log.civClassification.code === 'CIV_RECLASSIFY_SOLO' ? 'Reclassificação (P1/I1 + V2)' : 'Treinamento (V1 + I1/V2)'}
                       >
                         <i className="fas fa-id-card-clip text-[8px]"></i> CIV
                         <span className="font-mono normal-case">{log.civClassification.code}</span>
                       </span>
                     )}
                     <p className="text-[8px] font-mono text-slate-300 truncate w-32" title={log.hashIntegridade}>
                       {log.hashIntegridade}
                     </p>
                   </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button className="p-2 text-slate-400 hover:text-indigo-600 transition" title="Editar"
                      onClick={async () => {
                        const novoDesc = window.prompt('Observações adicionais para update da etapa:', '');
                        if (novoDesc == null) return;
                        try {
                          await apiPut(`/api/logs/${log.id}`, { observacoes: novoDesc });
                        } catch {}
                      }}
                    ><i className="fas fa-edit"></i></button>
                    <button className="p-2 text-amber-500 hover:text-amber-700 transition" title="Retificar"
                      onClick={async () => {
                        const just = window.prompt('Justificativa da retificação:', '');
                        if (just == null) return;
                        try {
                          await apiPost(`/api/logs/${log.id}/retificar`, { justification: just });
                        } catch {}
                      }}
                    ><i className="fas fa-screwdriver-wrench"></i></button>
                    <button className="p-2 text-green-500 hover:text-green-700 transition" title="Assinar Operador"
                      onClick={async () => {
                        const ok = window.confirm('Confirmar assinatura do operador nesta etapa?');
                        if (!ok) return;
                        try {
                          const res = await apiPut(`/api/logs/${log.id}/assinar-operador`, {});
                          track('logs.signOperator', { id: log.id });
                          setActionMessage({ type: 'success', text: 'Assinatura confirmada.' });
                        } catch (e: any) {
                          setActionMessage({ type: 'error', text: 'Falha ao assinar: ' + (e?.message || 'erro desconhecido') });
                        }
                      }}
                    ><i className="fas fa-signature"></i></button>
                    <button className={`p-2 transition ${log.isLocked ? 'text-gray-200 cursor-not-allowed' : 'text-gray-300 hover:text-red-500'}`} title="Excluir"
                      onClick={async () => {
                        if (log.isLocked) {
                          alert("Registro bloqueado pela ANAC. Registros assinados eletronicamente não podem ser excluídos, apenas retificados via Termo de Ressalva.");
                        } else {
                          try {
                            await apiDelete(`/api/logs/${log.id}`);
                            track('logs.delete', { id: log.id });
                            setActionMessage({ type: 'success', text: 'Etapa excluída.' });
                          } catch (e: any) {
                            setActionMessage({ type: 'error', text: 'Falha ao excluir: ' + (e?.message || 'erro desconhecido') });
                          }
                          onDeleteLog(log.id);
                        }
                      }}
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {(showOnlyCiv ? logs.filter(l => !!l.civClassification).length === 0 : logs.length === 0) && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <p className="text-gray-400 text-sm italic">Nenhuma etapa de voo registrada neste volume.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="px-6 pb-6">
          {(showOnlyCiv ? logs.filter(l => !!l.civClassification) : logs).map((log) => (
            <div key={log.id} className="mt-4 bg-white border rounded-lg p-4">
              {log.civClassification && (
                <div className="text-xs text-blue-700 font-bold">
                  Classificação CIV: {log.civClassification.code} {log.civClassification.notes ? `— ${log.civClassification.notes}` : ''}
                </div>
              )}
              {log.corrections && log.corrections.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs font-black uppercase text-gray-400 tracking-widest">Histórico de Retificações</div>
                  <ul className="mt-1 space-y-1">
                    {log.corrections.map((c, i) => (
                      <li key={i} className="text-xs text-gray-600">
                        <span className="font-bold">{c.field}</span>: "{String(c.oldValue)}" → "{String(c.newValue)}"
                        {` — ${c.justification}`} • Operador: {c.operatorId} • {new Date(c.timestamp).toLocaleString()}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FlightLogBook;
