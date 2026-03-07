import React from 'react';
import { useAppDomain } from '@/state/AppDomain';
import ComponentsManager from '@/components/ComponentsManager';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/services/api';
import { Component } from '@/types';
import { useQueryClient } from '@tanstack/react-query';

export default function ComponentsPage() {
  const { components, addComponent, updateComponent, deleteComponent } = useAppDomain() as any;
  const qc = useQueryClient();
  useQuery({ queryKey: ['components'], queryFn: () => apiGet<Component[]>('/api/components'), staleTime: 60_000 });
  return (
    <ComponentsManager
      components={components}
      onAddComponent={async (c) => { await addComponent(c); qc.invalidateQueries({ queryKey: ['components'] }); }}
      onUpdateComponent={async (id, patch) => { await updateComponent(id, patch); qc.invalidateQueries({ queryKey: ['components'] }); }}
      onDeleteComponent={async (id) => { await deleteComponent(id); qc.invalidateQueries({ queryKey: ['components'] }); }}
    />
  );
}
