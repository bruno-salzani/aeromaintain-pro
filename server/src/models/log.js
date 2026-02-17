import mongoose from 'mongoose';
import { addAuditLogSystem } from '../services/auditService.js';

const AeronautaSchema = new mongoose.Schema({
  aeronautaBrasileiro: Boolean,
  numeroDocumento: String,
  nome: String,
  nomeTripulanteEstrangeiro: String,
  emailTripulanteEstrangeiro: String,
  funcao: String,
  horarioApresentacao: String,
  siglaIcaoBaseContratual: String,
  descricaoBaseContratual: String
}, { _id: false });

const LogSchema = new mongoose.Schema({
  volumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Volume', required: true },
  naturezaVoo: String,
  aeronautas: [AeronautaSchema],
  siglaAerodromoDecolagem: String,
  latitudeDecolagem: String,
  longitudeDecolagem: String,
  localDecolagem: String,
  siglaAerodromoPouso: String,
  latitudePouso: String,
  longitudePouso: String,
  localPouso: String,
  horarioPartida: String,
  horarioDecolagem: String,
  horarioPouso: String,
  horarioCorteMotores: String,
  tempoVooTotal: String,
  tempoVooDiurno: String,
  tempoVooNoturno: String,
  tempoVooIFR: String,
  tempoVooIFRC: String,
  quantidadePessoasVoo: Number,
  cargaTransportada: mongoose.Schema.Types.Mixed,
  unidadeCargaTransportada: String,
  totalCombustivel: Number,
  unidadeCombustivel: String,
  milhasNavegacao: String,
  minutosNavegacao: String,
  numeroPousoEtapa: Number,
  numeroCicloEtapa: Number,
  dataHorarioAssinaturaPiloto: String,
  dataHorarioAssinaturaOperador: String,
  isLocked: { type: Boolean, default: true },
  hashIntegridade: String,
  blockTimeHours: Number,
  anacEtapaId: String,
  anacOperatorId: String,
  deleted: { type: Boolean, default: false },
  operatorCpfSignature: String,
  civClassification: {
    code: String,
    notes: String
  },
  ocorrencia: [{
    ocorrencia: String,
    datahoraOcorrencia: String,
    localOcorrencia: String,
    codigoClassificacaoOcorrencia: mongoose.Schema.Types.Mixed,
    latitude: String,
    longitude: String,
    qualificacaoCivilRefs: [{
      funcao: String
    }]
  }],
  corrections: [{
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    justification: String,
    operatorId: String,
    timestamp: String
  }]
}, { timestamps: true });

LogSchema.pre('validate', function(next) {
  try {
    const toDate = (s) => s ? new Date(s) : null;
    const partida = toDate(this.horarioPartida);
    const decolagem = toDate(this.horarioDecolagem);
    const pouso = toDate(this.horarioPouso);
    const corte = toDate(this.horarioCorteMotores);
    const hasPouso = Number(this.numeroPousoEtapa || 0) > 0;
    if (hasPouso) {
      if (!decolagem || !pouso) return next(new Error('Decolagem e Pouso são obrigatórios quando há pouso'));
      if (partida && decolagem && partida.getTime() > decolagem.getTime()) return next(new Error('Partida deve ser anterior ou igual à Decolagem'));
      if (decolagem && pouso && decolagem.getTime() > pouso.getTime()) return next(new Error('Decolagem deve ser anterior ou igual ao Pouso'));
      if (pouso && corte && pouso.getTime() > corte.getTime()) return next(new Error('Pouso deve ser anterior ou igual ao Corte'));
    } else {
      if (partida && corte && partida.getTime() > corte.getTime()) return next(new Error('Partida deve ser anterior ou igual ao Corte'));
    }
    next();
  } catch (e) {
    next(e);
  }
});

LogSchema.pre('save', async function(next) {
  try {
    if (!this.isNew) {
      const orig = await mongoose.model('Log').findById(this._id).lean();
      this.$locals = this.$locals || {};
      this.$locals.original = orig || {};
    }
    next();
  } catch (e) {
    void e;
    next();
  }
});

LogSchema.post('save', async function(doc) {
  try {
    const original = (this.$locals && this.$locals.original) || {};
    const fields = ['dataHorarioAssinaturaPiloto', 'dataHorarioAssinaturaOperador', 'operatorCpfSignature'];
    const changes = [];
    for (const k of fields) {
      const o = original ? original[k] : undefined;
      const n = doc[k];
      const oj = JSON.stringify(o);
      const nj = JSON.stringify(n);
      if (oj !== nj) {
        changes.push({ field: k, oldValue: o, newValue: n });
      }
    }
    if (changes.length > 0) {
      await addAuditLogSystem({
        action: 'UPDATE',
        resource: 'logs',
        resourceId: String(doc._id),
        payload: null,
        changes
      });
    }
  } catch (e) { void e; }
});

export const Log = mongoose.model('Log', LogSchema);
