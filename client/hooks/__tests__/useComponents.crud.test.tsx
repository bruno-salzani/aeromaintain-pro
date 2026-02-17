import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { useComponents } from '@/hooks/useComponents';
import { MaintenanceStatus } from '@/types';

function TestCRUD() {
  const aircraft = {
    id: 'a1',
    registration: 'PT-GAV',
    msn: '741',
    model: 'PC12',
    manufactureYear: 2006,
    totalHours: 1100,
    totalCycles: 0,
    nextIAMDate: '',
    validityCA: '',
    status: 'ATIVO'
  };
  const { components, addComponent, updateComponent, deleteComponent } = useComponents([], aircraft as any);
  const firstId = components[0]?.id || '';
  return (
    <div>
      <div data-testid="len">{components.length}</div>
      <div data-testid="id">{firstId}</div>
      <button data-testid="add" onClick={() => addComponent({
        aircraftId: 'a1',
        pn: 'PN',
        sn: 'SN',
        description: 'Desc',
        installedDate: '2020-01-01',
        installedHours: 1000,
        installedCycles: 0,
        lifeLimitHours: 1200,
        status: MaintenanceStatus.OK,
        ata: '27'
      })}></button>
      <button data-testid="edit" onClick={() => {
        const id = components[0]?.id!;
        updateComponent(id, { description: 'Updated' });
      }}></button>
      <button data-testid="delete" onClick={() => {
        const id = components[0]?.id!;
        deleteComponent(id);
      }}></button>
      <div data-testid="desc">{components[0]?.description || ''}</div>
    </div>
  );
}

describe('useComponents CRUD', () => {
  it('create, list, edit, delete', () => {
    const { getByTestId } = render(<TestCRUD />);
    expect(getByTestId('len').textContent).toBe('0');
    fireEvent.click(getByTestId('add'));
    expect(getByTestId('len').textContent).toBe('1');
    fireEvent.click(getByTestId('edit'));
    expect(getByTestId('desc').textContent).toBe('Updated');
    fireEvent.click(getByTestId('delete'));
    expect(getByTestId('len').textContent).toBe('0');
  });
});
