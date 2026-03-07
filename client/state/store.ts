import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Aircraft, FlightLog, Volume, UserRole } from '@/types';
import { INITIAL_AIRCRAFT } from '@/constants';

type Store = {
  isAuthenticated: boolean;
  token?: string | null;
  role?: UserRole | null;
  login: (token?: string | null, role?: UserRole | null) => void;
  logout: () => void;
  aircraft: Aircraft;
  setAircraft: (a: Aircraft) => void;
  logs: FlightLog[];
  addLog: (log: Omit<FlightLog, 'id'>) => void;
  deleteLog: (id: string) => void;
  volumes: Volume[];
  setVolumes: (v: Volume[]) => void;
  upsertVolume: (v: Volume) => void;
  closeVolumeLocal: (id: string, patch?: Partial<Volume>) => void;
};

export const useAppStore = create<Store>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      token: null,
      role: null,
      login: (token, role) => set({ isAuthenticated: true, token: token ?? null, role: role ?? null }),
      logout: () => set({ isAuthenticated: false, token: null, role: null }),
  aircraft: INITIAL_AIRCRAFT,
  setAircraft: (a) => set({ aircraft: a }),
  logs: [],
  addLog: (payload) => {
    const id = Math.random().toString(36).substr(2, 9);
    const log = { ...payload, id } as FlightLog;
    const blockTime = (payload as any).blockTimeHours || 0;
    const current = get().aircraft;
    set({
      logs: [log, ...get().logs],
      aircraft: {
        ...current,
        totalHours: current.totalHours + blockTime,
        totalCycles: current.totalCycles + log.numeroCicloEtapa
      }
    });
  },
  deleteLog: (id) => {
    const found = get().logs.find(l => l.id === id);
    const blockTime = (found as any)?.blockTimeHours || 0;
    const current = get().aircraft;
    set({
      logs: get().logs.filter(l => l.id !== id),
      aircraft: {
        ...current,
        totalHours: Math.max(0, current.totalHours - blockTime),
        totalCycles: Math.max(0, current.totalCycles - (found?.numeroCicloEtapa || 0))
      }
    });
  },
  volumes: [],
  setVolumes: (v) => set({ volumes: v }),
  upsertVolume: (v) => {
    const list = get().volumes;
    const exists = list.find(x => x.id === v.id);
    if (exists) {
      set({ volumes: list.map(x => (x.id === v.id ? { ...x, ...v } : x)) });
    } else {
      set({ volumes: [v, ...list] });
    }
  },
  closeVolumeLocal: (id, patch) => {
    set({
      volumes: get().volumes.map(v =>
        v.id === id ? { ...v, status: 'FECHADO', ...(patch || {}) } : v
      )
    });
  }
    }),
    {
      name: 'app-store',
      partialize: (state) => ({ isAuthenticated: state.isAuthenticated, token: state.token, role: state.role }),
      storage: createJSONStorage(() => localStorage)
    }
  )
);
