import React from 'react';
import { useAppDomain } from '@/state/AppDomain';
import MaintenanceManager from '@/components/MaintenanceManager';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet } from '@/services/api';
import { MaintenanceTask } from '@/types';
import { useEffect } from 'react';

export default function MaintenancePage() {
  const { tasks, setTasks, components, deleteTask, deleteComponent } = useAppDomain() as any;
  const qc = useQueryClient();
  const { data } = useQuery<MaintenanceTask[]>({ queryKey: ['tasks'], queryFn: () => apiGet<MaintenanceTask[]>('/api/tasks'), staleTime: 60_000 });
  useEffect(() => { if (data) setTasks(data as any); }, [data, setTasks]);
  return (
    <MaintenanceManager
      tasks={tasks}
      components={components}
      onAddWorkOrder={() => {}}
      onDeleteTask={(id: string) => { deleteTask(id); qc.invalidateQueries({ queryKey: ['tasks'] }); }}
      onDeleteComponent={deleteComponent}
    />
  );
}
