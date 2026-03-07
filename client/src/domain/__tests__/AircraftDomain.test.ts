import { describe, it, expect } from 'vitest';
import { AircraftDomain } from '../AircraftDomain';
import { Aircraft, FlightLog } from '@/types';

describe('AircraftDomain', () => {
  const initialAircraft: Aircraft = {
    id: '1',
    registration: 'PR-TEST',
    model: 'Cessna 172',
    totalHours: 100,
    totalCycles: 50,
    status: 'ATIVO',
  };

  it('should correctly apply flight log hours and cycles', () => {
    const log = {
      blockTimeHours: 2.5,
      numeroCicloEtapa: 1,
    } as FlightLog;

    const updated = AircraftDomain.applyFlightLog(initialAircraft, log);

    expect(updated.totalHours).toBe(102.5);
    expect(updated.totalCycles).toBe(51);
  });

  it('should handle zero hours and cycles', () => {
    const log = {
      blockTimeHours: 0,
      numeroCicloEtapa: 0,
    } as FlightLog;

    const updated = AircraftDomain.applyFlightLog(initialAircraft, log);

    expect(updated.totalHours).toBe(100);
    expect(updated.totalCycles).toBe(50);
  });

  it('should correctly revert flight log', () => {
    const aircraftWithFlight: Aircraft = {
      ...initialAircraft,
      totalHours: 102.5,
      totalCycles: 51,
    };

    const log = {
      blockTimeHours: 2.5,
      numeroCicloEtapa: 1,
    } as FlightLog;

    const reverted = AircraftDomain.revertFlightLog(aircraftWithFlight, log);

    expect(reverted.totalHours).toBe(100);
    expect(reverted.totalCycles).toBe(50);
  });

  it('should not allow negative hours when reverting', () => {
    const log = {
      blockTimeHours: 200,
      numeroCicloEtapa: 100,
    } as FlightLog;

    const reverted = AircraftDomain.revertFlightLog(initialAircraft, log);

    expect(reverted.totalHours).toBe(0);
    expect(reverted.totalCycles).toBe(0);
  });
});
