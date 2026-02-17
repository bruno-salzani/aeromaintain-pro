import { useEffect, useState } from 'react';
import { MaintenanceTask } from '@/types';
import { apiGet, apiDeleteWithHeaders } from '@/services/api';

export function useMaintenanceTasks(initialTasks: MaintenanceTask[]) {
  const [tasks, setTasks] = useState<MaintenanceTask[]>(initialTasks);

  useEffect(() => {
    apiGet<MaintenanceTask[]>('/api/tasks')
      .then(list => setTasks(list as any))
      .catch(() => void 0);
  }, []);

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    apiDeleteWithHeaders(`/api/tasks/${id}`, { 'x-role': 'ADMINISTRADOR' }).catch(() => void 0);
  };

  return { tasks, setTasks, deleteTask };
}
