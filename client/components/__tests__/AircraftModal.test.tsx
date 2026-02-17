import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import AircraftModal from '@/components/AircraftModal';
import { Aircraft } from '@/types';

vi.mock('@/services/api', () => ({
  apiPut: vi.fn().mockResolvedValue({})
}));

const baseAircraft: Aircraft = {
  id: 'a1',
  registration: 'PT-GAV',
  msn: '741',
  model: 'PC12',
  manufactureYear: 2006,
  totalHours: 1000,
  totalCycles: 500,
  nextIAMDate: '',
  validityCA: '',
  status: 'ATIVO'
};

describe('AircraftModal', () => {
  it('submits and closes', async () => {
    const onSaveLocal = vi.fn();
    const onClose = vi.fn();
    const { getByText, getAllByRole } = render(
      <AircraftModal aircraft={baseAircraft} onSaveLocal={onSaveLocal} onClose={onClose} />
    );
    const inputs = getAllByRole('textbox');
    // registration then model
    fireEvent.change(inputs[1], { target: { value: 'PC12/47' } });
    fireEvent.click(getByText('Salvar'));
    expect(onSaveLocal).toHaveBeenCalled();
    // close via button X
    const closeBtn = document.querySelector('button[aria-label="Fechar"]') as HTMLButtonElement;
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
