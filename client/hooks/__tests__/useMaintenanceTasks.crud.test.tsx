import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { useMaintenanceTasks } from '@/hooks/useMaintenanceTasks';

function TestCRUD() {
  const { tasks, setTasks, deleteTask } = useMaintenanceTasks([]);
  return (
    <div>
      <div data-testid="len">{tasks.length}</div>
      <button data-testid="seed" onClick={() => setTasks([{ id: 't1', aircraftId: 'a1', ata: '27', description: 'Teste' } as any])}></button>
      <button data-testid="delete" onClick={() => deleteTask('t1')}></button>
    </div>
  );
}

describe('useMaintenanceTasks CRUD', () => {
  it('list, delete', () => {
    const { getByTestId } = render(<TestCRUD />);
    expect(getByTestId('len').textContent).toBe('0');
    fireEvent.click(getByTestId('seed'));
    expect(getByTestId('len').textContent).toBe('1');
    fireEvent.click(getByTestId('delete'));
    expect(getByTestId('len').textContent).toBe('0');
  });
});
