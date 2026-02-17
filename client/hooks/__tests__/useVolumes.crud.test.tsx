import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { useVolumes } from '@/hooks/useVolumes';

function TestCRUD() {
  const { volumes, addVolume, closeVolume } = useVolumes([]);
  return (
    <div>
      <div data-testid="len">{volumes.length}</div>
      <div data-testid="status">{volumes[0]?.status || ''}</div>
      <button data-testid="add" onClick={() => addVolume({
        numeroVolume: '01/PT-GAV/2026',
        dataAbertura: '2026-02-11',
        minutosTotaisVooInicio: 1000,
        totalPousosInicio: 500,
        totalCiclosCelulaInicio: 500,
        observacoesAbertura: '',
        matriculaAeronave: 'PT-GAV',
        status: 'ABERTO'
      } as any)}></button>
      <button data-testid="close" onClick={() => {
        const id = volumes[0]?.id!;
        closeVolume(id, 'Encerrado');
      }}></button>
    </div>
  );
}

describe('useVolumes CRUD', () => {
  it('create, list, close', () => {
    const { getByTestId } = render(<TestCRUD />);
    expect(getByTestId('len').textContent).toBe('0');
    fireEvent.click(getByTestId('add'));
    expect(getByTestId('len').textContent).toBe('1');
    expect(getByTestId('status').textContent).toBe('ABERTO');
    fireEvent.click(getByTestId('close'));
    expect(getByTestId('status').textContent).toBe('FECHADO');
  });
});
