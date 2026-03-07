import { Aircraft, FlightLog } from '@/types';

/**
 * Domain Logic for Aircraft Management
 * Enforces business rules for flight hours and cycle calculations.
 */
export class AircraftDomain {
  /**
   * Calculates new total hours and cycles after adding a flight log.
   */
  static applyFlightLog(current: Aircraft, log: FlightLog): Aircraft {
    const blockTime = log.blockTimeHours || 0;
    
    return {
      ...current,
      totalHours: current.totalHours + blockTime,
      totalCycles: current.totalCycles + (log.numeroCicloEtapa || 0)
    };
  }

  /**
   * Reverts changes from a removed flight log.
   */
  static revertFlightLog(current: Aircraft, log: FlightLog): Aircraft {
    const blockTime = log.blockTimeHours || 0;
    
    return {
      ...current,
      totalHours: Math.max(0, current.totalHours - blockTime),
      totalCycles: Math.max(0, current.totalCycles - (log.numeroCicloEtapa || 0))
    };
  }
}
