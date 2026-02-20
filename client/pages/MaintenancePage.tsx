import React from 'react';
import { useAppDomain } from '@/state/AppDomain';
import MaintenanceManager from '@/components/MaintenanceManager';

export default function MaintenancePage() {
  const { tasks, components, deleteTask, deleteComponent } = useAppDomain() as any;
  return (
    <MaintenanceManager
      tasks={tasks}
      components={components}
      onAddWorkOrder={() => {}}
      onDeleteTask={deleteTask}
      onDeleteComponent={deleteComponent}
    />
  );
}

