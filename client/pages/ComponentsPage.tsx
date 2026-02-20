import React from 'react';
import { useAppDomain } from '@/state/AppDomain';
import ComponentsManager from '@/components/ComponentsManager';

export default function ComponentsPage() {
  const { components, addComponent, updateComponent, deleteComponent } = useAppDomain() as any;
  return (
    <ComponentsManager
      components={components}
      onAddComponent={addComponent}
      onUpdateComponent={updateComponent}
      onDeleteComponent={deleteComponent}
    />
  );
}

