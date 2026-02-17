
import { Aircraft, Component, MaintenanceStatus, MaintenanceTask } from './types';

export const INITIAL_AIRCRAFT: Aircraft = {
  id: 'pt-gav-id',
  registration: 'PT-GAV',
  msn: '741',
  model: 'PILATUS PC12/47',
  manufactureYear: 2006,
  totalHours: 1710.3,
  totalCycles: 1398,
  nextIAMDate: '2019-02-27',
  validityCA: '2021-02-01',
  status: 'ATIVO'
};

export const MOCK_COMPONENTS: Component[] = [
  {
    id: 'c1',
    aircraftId: 'pt-gav-id',
    pn: '129-1-1100-02',
    sn: '728',
    description: 'PITCH TRIM ACTUATOR',
    installedDate: '2015-01-01',
    installedHours: 1200,
    installedCycles: 900,
    lifeLimitHours: 500,
    remainingHours: -50,
    status: MaintenanceStatus.VENCIDO,
    ata: '27'
  },
  {
    id: 'c2',
    aircraftId: 'pt-gav-id',
    pn: '23085-025',
    sn: 'SG-102',
    description: 'STARTER - GENERATOR',
    installedDate: '2018-05-10',
    installedHours: 1600,
    installedCycles: 1300,
    remainingHours: 282,
    status: MaintenanceStatus.OK,
    ata: '24'
  },
  {
    id: 'c3',
    aircraftId: 'pt-gav-id',
    pn: '31406-002',
    sn: 'BAT-99',
    description: 'MAIN BATTERY NI-CAD',
    installedDate: '2018-08-15',
    installedHours: 1650,
    installedCycles: 1350,
    calendarLimitDays: 180,
    remainingDays: 180,
    status: MaintenanceStatus.OK,
    ata: '24'
  }
];

export const MOCK_TASKS: MaintenanceTask[] = [
  {
    id: 't1',
    aircraftId: 'pt-gav-id',
    ata: '32',
    description: 'Aferição da Bússola',
    lastDoneDate: '2018-01-10',
    lastDoneHours: 1550,
    nextDueHours: 1710,
    isComplianceItem: false
  },
  {
    id: 't2',
    aircraftId: 'pt-gav-id',
    ata: '35',
    description: 'Inspeção das máscaras de oxigênio',
    lastDoneDate: '2017-02-15',
    lastDoneHours: 1400,
    isComplianceItem: true
  },
  {
    id: 't3',
    aircraftId: 'pt-gav-id',
    ata: '53',
    description: 'Inspeção do Front Pressure Bulkhead',
    lastDoneDate: '2018-06-20',
    lastDoneHours: 1620,
    nextDueDate: '2019-07-20',
    isComplianceItem: false
  }
];
