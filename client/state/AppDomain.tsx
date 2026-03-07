import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { Aircraft, FlightLog, Volume } from '@/types';
import { INITIAL_AIRCRAFT, MOCK_COMPONENTS, MOCK_TASKS } from '@/constants';
import { useComponents } from '@/hooks/useComponents';
import { useMaintenanceTasks } from '@/hooks/useMaintenanceTasks';
import { useVolumes } from '@/hooks/useVolumes';
import { useCompliance } from '@/hooks/useCompliance';
import { useUsers } from '@/hooks/useUsers';
import { apiGet, apiPutWithHeaders } from '@/services/api';
import { useAppStore } from '@/state/store';

type DomainContext = {
  isAuthenticated: boolean;
  role: import('@/types').UserRole | null | undefined;
  login: () => void;
  logout: () => void;
  aircraft: Aircraft;
  setAircraft: (a: Aircraft) => void;
  logs: FlightLog[];
  addFlightLog: (log: Omit<FlightLog, 'id'>) => void;
  deleteFlightLog: (id: string) => void;
  volumes: ReturnType<typeof useVolumes>['volumes'];
  setVolumes: ReturnType<typeof useVolumes>['setVolumes'];
  addVolume: ReturnType<typeof useVolumes>['addVolume'];
  closeVolume: ReturnType<typeof useVolumes>['closeVolume'];
  updateVolumeLocal: ReturnType<typeof useVolumes>['updateVolumeLocal'];
  components: ReturnType<typeof useComponents>['components'];
  addComponent: ReturnType<typeof useComponents>['addComponent'];
  updateComponent: ReturnType<typeof useComponents>['updateComponent'];
  deleteComponent: ReturnType<typeof useComponents>['deleteComponent'];
  tasks: ReturnType<typeof useMaintenanceTasks>['tasks'];
  setTasks: ReturnType<typeof useMaintenanceTasks>['setTasks'];
  deleteTask: ReturnType<typeof useMaintenanceTasks>['deleteTask'];
  complianceItems: ReturnType<typeof useCompliance>['complianceItems'];
  setComplianceItems: ReturnType<typeof useCompliance>['setComplianceItems'];
  addComplianceItem: ReturnType<typeof useCompliance>['addComplianceItem'];
  deleteComplianceItem: ReturnType<typeof useCompliance>['deleteComplianceItem'];
  users: ReturnType<typeof useUsers>['users'];
  addUser: ReturnType<typeof useUsers>['addUser'];
  updateUser: ReturnType<typeof useUsers>['updateUser'];
  deleteUser: ReturnType<typeof useUsers>['deleteUser'];
};

const Ctx = createContext<DomainContext | null>(null);

export const AppDomainProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAppStore(s => s.isAuthenticated);
  const role = useAppStore(s => s.role);
  const login = useAppStore(s => s.login);
  const logout = useAppStore(s => s.logout);
  const aircraft = useAppStore(s => s.aircraft);
  const setAircraft = useAppStore(s => s.setAircraft);
  const logs = useAppStore(s => s.logs);
  const addLog = useAppStore(s => s.addLog);
  const deleteLogStore = useAppStore(s => s.deleteLog);
  const { components, addComponent, updateComponent, deleteComponent, setComponents } = useComponents(MOCK_COMPONENTS, aircraft);
  const { tasks, setTasks, deleteTask } = useMaintenanceTasks(MOCK_TASKS);
  const { volumes, setVolumes, addVolume, closeVolume, updateVolumeLocal } = useVolumes([]);
  const { complianceItems, setComplianceItems, addComplianceItem, deleteComplianceItem } = useCompliance([
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
    addLog(newLog);
  };

  const deleteFlightLog = (id: string) => {
    deleteLogStore(id);
  };

  const value = useMemo<DomainContext>(() => ({
    isAuthenticated,
    role,
    login,
    logout,
    aircraft,
    setAircraft,
    logs,
    addFlightLog,
    deleteFlightLog,
    volumes,
    setVolumes,
    addVolume,
    closeVolume,
    updateVolumeLocal,
    components,
    addComponent,
    updateComponent,
    deleteComponent,
    tasks,
    setTasks,
    deleteTask,
    complianceItems,
    setComplianceItems,
    addComplianceItem,
    deleteComplianceItem,
    users,
    addUser,
    updateUser,
    deleteUser
  }), [
    isAuthenticated,
    role,
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
