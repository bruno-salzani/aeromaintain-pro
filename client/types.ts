
export enum MaintenanceStatus {
  OK = 'OK',
  VENCIDO = 'VENCIDO',
  EM_MANUTENCAO = 'EM_MANUTENCAO',
  REMOVIDO = 'REMOVIDO',
  CRITICO = 'CRITICO'
}

export enum WOStatus {
  ABERTA = 'ABERTA',
  EM_EXECUCAO = 'EM_EXECUCAO',
  FECHADA = 'FECHADA',
  CANCELADA = 'CANCELADA'
}

export interface Aircraft {
  id: string;
  registration: string;
  msn: string;
  model: string;
  manufactureYear: number;
  totalHours: number;
  totalCycles: number;
  nextIAMDate: string;
  validityCA: string;
  status: 'ATIVO' | 'PARADO' | 'MANUTENCAO';
}

export interface Volume {
  id: string;
  matriculaAeronave: string;
  numeroVolume: string;
  dataAbertura: string;
  dataFechamento?: string;
  minutosTotaisVooInicio: number;
  totalPousosInicio: number;
  totalCiclosCelulaInicio: number;
  status: 'ABERTO' | 'FECHADO';
  observacoesAbertura?: string;
  observacoesFechamento?: string;
  horasVooMotor?: Record<string, string>;
  ciclosMotor?: Record<string, string>;
  anacVolumeId?: string;
  anacOperatorIds?: string[];
  autoClose?: boolean;
}

export interface Aeronauta {
  aeronautaBrasileiro: boolean;
  numeroDocumento: string; // CPF or License
  nome?: string;
  funcao: string; // ID 1-14
  horarioApresentacao?: string;
}

export interface FlightLog {
  id: string;
  volumeId: string;
  naturezaVoo: string; // ID 1-10
  aeronautas: Aeronauta[];
  siglaAerodromoDecolagem: string;
  siglaAerodromoPouso: string;
  horarioPartida: string;
  horarioDecolagem: string;
  horarioPouso: string;
  horarioCorteMotores: string;
  tempoVooTotal: string; // HH:MM
  quantidadePessoasVoo: number;
  totalCombustivel: number;
  unidadeCombustivel: 'L' | 'KG' | 'LB';
  numeroPousoEtapa: number;
  numeroCicloEtapa: number;
  dataHorarioAssinaturaPiloto: string;
  dataHorarioAssinaturaOperador?: string;
  isLocked: boolean; // ANAC: Imutabilidade após assinatura
  hashIntegridade?: string; // SHA-256 simulado
  civClassification?: { code: string; notes?: string };
  corrections?: Array<{ field: string; oldValue: any; newValue: any; justification: string; operatorId: string; timestamp: string }>;
}

export interface Component {
  id: string;
  aircraftId: string;
  pn: string;
  sn: string;
  description: string;
  installedDate: string;
  installedHours: number;
  installedCycles: number;
  lifeLimitHours?: number;
  lifeLimitCycles?: number;
  calendarLimitDays?: number;
  remainingHours?: number;
  remainingDays?: number;
  status: MaintenanceStatus;
  ata: string;
}

export interface ComplianceItem {
  id: string;
  type: 'AD' | 'DA' | 'SB';
  referenceNumber: string; // e.g., DA 2024-05-01
  description: string;
  applicableTo: string; // e.g., Airframe, Engine, Propeller
  ata: string;
  effectiveDate: string;
  lastPerformedDate?: string;
  lastPerformedHours?: number;
  nextDueHours?: number;
  nextDueDate?: string;
  status: 'CUMPRIDA' | 'PENDENTE' | 'REPETITIVA';
  notes?: string;
}

export interface MaintenanceTask {
  id: string;
  aircraftId: string;
  ata: string;
  description: string;
  intervalHours?: number;
  intervalCycles?: number;
  intervalDays?: number;
  lastDoneDate: string;
  lastDoneHours: number;
  nextDueHours?: number;
  nextDueDate?: string;
  linkedComponentId?: string;
  isComplianceItem: boolean;
}

export interface WorkOrder {
  id: string;
  aircraftId: string;
  description: string;
  tasks: string[];
  assignedMRO: string;
  status: WOStatus;
  createdAt: string;
  closedAt?: string;
  costEstimate: number;
  actualCost?: number;
  technicianName: string;
  attachments: string[];
}

export type UserRole = 'ADMIN' | 'OPERADOR' | 'MANUTENCAO' | 'VISUALIZADOR';

export interface User {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  ativo: boolean;
}

export interface AuditLog {
  id?: string;
  action: string;
  resource: string;
  resourceId?: string;
  method?: string;
  statusCode?: number;
  user?: string;
  ip?: string;
  ua?: string;
  payload?: any;
  createdAt?: string;
}
