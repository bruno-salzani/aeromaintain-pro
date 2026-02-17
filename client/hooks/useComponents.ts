import { useEffect, useState } from 'react';
import { Aircraft, Component } from '@/types';
import { apiGet, apiPostWithHeaders, apiPatch, apiDeleteWithHeaders } from '@/services/api';

export function useComponents(initialComponents: Component[], aircraft: Aircraft) {
  const [components, setComponents] = useState<Component[]>(initialComponents);

  useEffect(() => {
    apiGet<Component[]>('/api/components')
      .then(list => setComponents(list as any))
      .catch(() => void 0);
  }, []);

  const addComponent = async (newComp: Omit<Component, 'id'>) => {
    const comp: Component = {
      ...newComp,
      id: Math.random().toString(36).substr(2, 9),
      remainingHours: newComp.lifeLimitHours
        ? newComp.lifeLimitHours - (aircraft.totalHours - newComp.installedHours)
        : undefined
    };
    setComponents(prev => [comp, ...prev]);
    apiPostWithHeaders<Component>('/api/components', newComp, { 'x-role': 'MANUTENCAO' })
      .then(created => {
        setComponents(prev => [created as any, ...prev.filter(c => c.id !== comp.id)]);
      })
      .catch(() => void 0);
  };

  const updateComponent = (id: string, updated: Partial<Component>) => {
    setComponents(prev => prev.map(c => (c.id === id ? { ...c, ...updated } : c)));
    apiPatch<Component>(`/api/components/${id}`, updated).catch(() => void 0);
  };

  const deleteComponent = (id: string) => {
    setComponents(prev => prev.filter(c => c.id !== id));
    apiDeleteWithHeaders(`/api/components/${id}`, { 'x-role': 'MANUTENCAO' }).catch(() => void 0);
  };

  return { components, addComponent, updateComponent, deleteComponent, setComponents };
}
