import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { useCompliance } from '@/hooks/useCompliance';

function TestCRUD() {
  const { complianceItems, addComplianceItem, deleteComplianceItem } = useCompliance([]);
  return (
    <div>
      <div data-testid="len">{complianceItems.length}</div>
      <button data-testid="add" onClick={() => addComplianceItem({
        type: 'DA',
        referenceNumber: '2025-01-01',
        description: 'Teste',
        applicableTo: 'Célula',
        ata: '27',
        effectiveDate: '2025-01-01',
        status: 'PENDENTE',
        notes: ''
      })}></button>
      <button data-testid="delete" onClick={() => {
        const id = complianceItems[0]?.id!;
        deleteComplianceItem(id);
      }}></button>
    </div>
  );
}

describe('useCompliance CRUD', () => {
  it('create, list, delete', () => {
    const { getByTestId } = render(<TestCRUD />);
    expect(getByTestId('len').textContent).toBe('0');
    fireEvent.click(getByTestId('add'));
    expect(getByTestId('len').textContent).toBe('1');
    fireEvent.click(getByTestId('delete'));
    expect(getByTestId('len').textContent).toBe('0');
  });
});
