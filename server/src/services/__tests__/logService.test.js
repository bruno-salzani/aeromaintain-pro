import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../models/volume.js', () => {
  return {
    Volume: {
      findOne: vi.fn()
    }
  };
});

vi.mock('../../models/log.js', () => {
  return {
    Log: {
      create: vi.fn(),
      findById: vi.fn()
    }
  };
});

vi.mock('../../models/aircraft.js', () => {
  return {
    Aircraft: {
      findOne: vi.fn().mockResolvedValue({ totalHours: 0, totalCycles: 0, save: vi.fn() })
    }
  };
});

vi.mock('../../models/component.js', () => {
  return {
    Component: {
      find: vi.fn().mockResolvedValue([])
    }
  };
});

vi.mock('../anacService.js', () => {
  return {
    postFlightOnAnac: vi.fn().mockResolvedValue('2452')
  };
});

vi.mock('../civService.js', () => {
  return {
    classifyCiv: vi.fn().mockReturnValue(undefined)
  };
});

const { Volume } = await import('../../models/volume.js');
const { Log } = await import('../../models/log.js');
const { postFlightOnAnac } = await import('../anacService.js');
const { addLog } = await import('../logService.js');

describe('logService.addLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Volume.findOne.mockResolvedValue({
      _id: 'v1',
      status: 'ABERTO',
      dataAbertura: '2025-04-01T09:00:00Z',
      anacVolumeId: '1384',
      anacOperatorIds: ['ID_ALFA']
    });
    Log.create.mockResolvedValue({ _id: 'l1', toObject: () => ({ _id: 'l1' }) });
    Log.findById.mockResolvedValue({ save: vi.fn() });
  });

  it('rejeita etapa com decolagem anterior à abertura do volume', async () => {
    const data = {
      volumeId: 'v1',
      naturezaVoo: '4',
      siglaAerodromoDecolagem: 'SBSV',
      siglaAerodromoPouso: 'SBAR',
      horarioPartida: '2025-04-01T08:50:00Z',
      horarioDecolagem: '2025-04-01T08:55:00Z',
      horarioPouso: '2025-04-01T09:25:00Z',
      horarioCorteMotores: '2025-04-01T09:35:03Z',
      numeroPousoEtapa: 1,
      numeroCicloEtapa: 1,
      aeronautas: [{ aeronautaBrasileiro: true, numeroDocumento: '123', funcao: '1' }]
    };
    await expect(addLog(data)).rejects.toThrow('Etapa com data anterior ou igual à abertura do volume');
    expect(Log.create).not.toHaveBeenCalled();
  });

  it('envia campos estendidos e ocorrências ao ANAC', async () => {
    const data = {
      volumeId: 'v1',
      naturezaVoo: '2',
      siglaAerodromoDecolagem: 'SBSV',
      latitudeDecolagem: '55.66',
      longitudeDecolagem: '53.22',
      localDecolagem: 'Local D',
      siglaAerodromoPouso: 'SBAR',
      latitudePouso: '61.66',
      longitudePouso: '-61.33',
      localPouso: 'Local P',
      horarioPartida: '2025-04-01T09:06:00Z',
      horarioDecolagem: '2025-04-01T09:16:00Z',
      horarioPouso: '2025-04-01T09:25:00Z',
      horarioCorteMotores: '2025-04-01T09:35:03Z',
      numeroPousoEtapa: 1,
      numeroCicloEtapa: 2,
      tempoVooDiurno: '00:05',
      tempoVooNoturno: '00:05',
      tempoVooIFR: '00:10',
      tempoVooIFRC: '00:05',
      quantidadePessoasVoo: 2,
      cargaTransportada: '120',
      unidadeCargaTransportada: 'KG',
      totalCombustivel: '500',
      unidadeCombustivel: 'L',
      milhasNavegacao: '15',
      minutosNavegacao: '10',
      aeronautas: [{ aeronautaBrasileiro: false, numeroDocumento: 'USA1176', funcao: '1' }],
      ocorrencia: [{
        ocorrencia: 'Ocorrência simulada',
        datahoraOcorrencia: '2025-04-01T09:20:00Z',
        localOcorrencia: 'Interior da aeronave',
        codigoClassificacaoOcorrencia: '1',
        latitude: '-23.55',
        longitude: '-46.63',
        qualificacaoCivilRefs: [{ funcao: '1' }]
      }]
    };
    await addLog(data);
    expect(postFlightOnAnac).toHaveBeenCalledTimes(1);
    const payload = postFlightOnAnac.mock.calls[0][0];
    expect(payload.idDiarioBordoVolume).toBe('1384');
    expect(payload.idDiarioBordoOperador).toBe('ID_ALFA');
    expect(payload.latitudeDecolagem).toBe('55.66');
    expect(payload.ocorrencia?.length).toBe(1);
  });
});
