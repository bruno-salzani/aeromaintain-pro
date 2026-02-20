import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Aircraft, FlightLog, Volume } from '@/types';
import { INITIAL_AIRCRAFT, MOCK_COMPONENTS, MOCK_TASKS } from '@/constants';
import { useComponents } from '@/hooks/useComponents';
import { useMaintenanceTasks } from '@/hooks/useMaintenanceTasks';
import { useVolumes } from '@/hooks/useVolumes';
import { useCompliance } from '@/hooks/useCompliance';
import { useUsers } from '@/hooks/useUsers';
import { apiGet, apiPutWithHeaders } from '@/services/api';

type DomainContext = {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  aircraft: Aircraft;
  setAircraft: React.Dispatch<React.SetStateAction<Aircraft>>;
  logs: FlightLog[];
  addFlightLog: (log: Omit<FlightLog, 'id'>) => void;
  deleteFlightLog: (id: string) => void;
  volumes: ReturnType<typeof useVolumes>['volumes'];
  addVolume: ReturnType<typeof useVolumes>['addVolume'];
  closeVolume: ReturnType<typeof useVolumes>['closeVolume'];
  updateVolumeLocal: ReturnType<typeof useVolumes>['updateVolumeLocal'];
  components: ReturnType<typeof useComponents>['components'];
  addComponent: ReturnType<typeof useComponents>['addComponent'];
  updateComponent: ReturnType<typeof useComponents>['updateComponent'];
  deleteComponent: ReturnType<typeof useComponents>['deleteComponent'];
  tasks: ReturnType<typeof useMaintenanceTasks>['tasks'];
  deleteTask: ReturnType<typeof useMaintenanceTasks>['deleteTask'];
  complianceItems: ReturnType<typeof useCompliance>['complianceItems'];
  addComplianceItem: ReturnType<typeof useCompliance>['addComplianceItem'];
  deleteComplianceItem: ReturnType<typeof useCompliance>['deleteComplianceItem'];
  users: ReturnType<typeof useUsers>['users'];
  addUser: ReturnType<typeof useUsers>['addUser'];
  updateUser: ReturnType<typeof useUsers>['updateUser'];
  deleteUser: ReturnType<typeof useUsers>['deleteUser'];
};

const Ctx = createContext<DomainContext | null>(null);

export const AppDomainProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [aircraft, setAircraft] = useState<Aircraft>(INITIAL_AIRCRAFT);
  const [logs, setLogs] = useState<FlightLog[]>([]);
  const { components, addComponent, updateComponent, deleteComponent, setComponents } = useComponents(MOCK_COMPONENTS, aircraft);
  const { tasks, deleteTask } = useMaintenanceTasks(MOCK_TASKS);
  const { volumes, addVolume, closeVolume, updateVolumeLocal } = useVolumes([]);
  const { complianceItems, addComplianceItem, deleteComplianceItem } = useCompliance([
    {
      id: 'da1',
      type: 'DA',
      referenceNumber: '2019-02-01',
      description: 'Inspeção periódica do pitch trim actuator',
      applicableTo: 'Célula',
      ata: '27',
      effectiveDate: '2019-02-27',
      status: 'PENDENTE',
      nextDueHours: 1710
    }
  ]);
  const { users, addUser, updateUser, deleteUser } = useUsers([]);

  useEffect(() => {
    apiGet('/api/csrf').catch(() => void 0);
    apiGet<Aircraft>('/api/aircraft')
      .then(data => {
        if (data) setAircraft(data as any);
      })
      .catch(() => void 0);
  }, []);

  const addFlightLog = (newLog: Omit<FlightLog, 'id'>) => {
    const log: FlightLog = { ...(newLog as any), id: Math.random().toString(36).substr(2, 9) } as FlightLog;
    setLogs(prev => [log, ...prev]);
    const blockTime = (newLog as any).blockTimeHours || 0;
    setAircraft(prev => ({
      ...prev,
      totalHours: prev.totalHours + blockTime,
      totalCycles: prev.totalCycles + log.numeroCicloEtapa
    }));
    setComponents(prev => prev.map(c => {
      if (c.remainingHours !== undefined) {
        const newRemaining = c.remainingHours - blockTime;
        return {
          ...c,
          remainingHours: newRemaining
        };
      }
      return c;
    }));
  };

  const deleteFlightLog = (id: string) => {
    setLogs(prevLogs => {
      const logToDelete = prevLogs.find(l => l.id === id);
      if (!logToDelete) return prevLogs;
      const blockTime = (logToDelete as any).blockTimeHours || 0;
      setAircraft(prevAircraft => ({
        ...prevAircraft,
        totalHours: Math.max(0, prevAircraft.totalHours - blockTime),
        totalCycles: Math.max(0, prevAircraft.totalCycles - logToDelete.numeroCicloEtapa)
      }));
      return prevLogs.filter(l => l.id !== id);
    });
  };

  const value = useMemo<DomainContext>(() => ({
    isAuthenticated,
    login: () => setIsAuthenticated(true),
    logout: () => setIsAuthenticated(false),
    aircraft,
    setAircraft,
    logs,
    addFlightLog,
    deleteFlightLog,
    volumes,
    addVolume,
    closeVolume,
    updateVolumeLocal,
    components,
    addComponent,
    updateComponent,
    deleteComponent,
    tasks,
    deleteTask,
    complianceItems,
    addComplianceItem,
    deleteComplianceItem,
    users,
    addUser,
    updateUser,
    deleteUser
  }), [
    isAuthenticated,
    aircraft,
    logs,
    volumes,
    components,
    tasks,
    complianceItems,
    users
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useAppDomain() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('missing AppDomainProvider');
  return ctx;
}

