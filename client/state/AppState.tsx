import React, { createContext, useContext, useReducer } from 'react';
import { Aircraft, FlightLog, Volume } from '@/types';
import { INITIAL_AIRCRAFT } from '@/constants';

type State = {
  aircraft: Aircraft;
  logs: FlightLog[];
  volumes: Volume[];
};

type Action =
  | { type: 'setAircraft'; payload: Aircraft }
  | { type: 'addLog'; payload: Omit<FlightLog, 'id'> }
  | { type: 'deleteLog'; payload: { id: string } }
  | { type: 'openVolume'; payload: Omit<Volume, 'id'> }
  | { type: 'closeVolume'; payload: { id: string; observations?: string } };

const AppStateContext = createContext<{ state: State; dispatch: React.Dispatch<Action> } | null>(null);

function reducer(state: State, action: Action): State {
  if (action.type === 'setAircraft') return { ...state, aircraft: action.payload };
  if (action.type === 'addLog') {
    const id = Math.random().toString(36).substr(2, 9);
    const log = { ...action.payload, id } as FlightLog;
    return { ...state, logs: [log, ...state.logs] };
  }
  if (action.type === 'deleteLog') return { ...state, logs: state.logs.filter(l => l.id !== action.payload.id) };
  if (action.type === 'openVolume') {
    const id = Math.random().toString(36).substr(2, 9);
    const volume = { ...action.payload, id, status: 'ABERTO' } as Volume;
    return { ...state, volumes: [volume, ...state.volumes] };
  }
  if (action.type === 'closeVolume') {
    return { ...state, volumes: state.volumes.map(v => (v.id === action.payload.id ? { ...v, status: 'FECHADO' } : v)) };
  }
  return state;
}

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, { aircraft: INITIAL_AIRCRAFT, logs: [], volumes: [] });
  return <AppStateContext.Provider value={{ state, dispatch }}>{children}</AppStateContext.Provider>;
};

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('missing AppStateProvider');
  return ctx;
}
