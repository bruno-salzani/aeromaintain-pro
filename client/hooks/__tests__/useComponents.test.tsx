import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { useComponents } from '@/hooks/useComponents';
import { MaintenanceStatus } from '@/types';

function TestComponent({ totalHours }: { totalHours: number }) {
  const { components, addComponent } = useComponents([], {
    id: 'a1',
    registration: 'PT-GAV',
    msn: '741',
    model: 'PC12',
    manufactureYear: 2006,
    totalHours,
    totalCycles: 0,
    nextIAMDate: '',
    validityCA: '',
    status: 'ATIVO'
  });
  React.useEffect(() => {
    addComponent({
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
    });
  }, []);
  return <div data-testid="remaining">{components[0]?.remainingHours?.toFixed(1)}</div>;
}

describe('useComponents', () => {
  it('computes remaining hours based on aircraft total hours', () => {
    const { getByTestId } = render(<TestComponent totalHours={1100} />);
    expect(getByTestId('remaining').textContent).toBe('1100.0');
  });
});
