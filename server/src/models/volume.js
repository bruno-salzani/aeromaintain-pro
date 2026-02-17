import mongoose from 'mongoose';
import { addAuditLogSystem } from '../services/auditService.js';

const VolumeSchema = new mongoose.Schema({
  matriculaAeronave: String,
  numeroVolume: String,
  dataAbertura: String,
  dataFechamento: String,
  minutosTotaisVooInicio: Number,
  totalPousosInicio: Number,
  totalCiclosCelulaInicio: Number,
  status: { type: String, enum: ['ABERTO', 'FECHADO'], default: 'ABERTO' },
  observacoesAbertura: String,
  observacoesFechamento: String,
  anacVolumeId: String,
  anacOperatorIds: [String]
}, { timestamps: true });

VolumeSchema.pre('save', async function(next) {
  try {
    if (!this.isNew) {
      const orig = await mongoose.model('Volume').findById(this._id).lean();
      this.$locals = this.$locals || {};
      this.$locals.original = orig || {};
    }
    next();
  } catch (e) {
    void e;
    next();
  }
});

VolumeSchema.post('save', async function(doc) {
  try {
    const original = (this.$locals && this.$locals.original) || {};
    const fields = ['status', 'dataAbertura', 'dataFechamento', 'observacoesAbertura', 'observacoesFechamento', 'anacVolumeId', 'anacOperatorIds'];
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
      let action = 'UPDATE';
      const prev = original?.status;
      const curr = doc.status;
      if (prev !== curr) {
        if (curr === 'ABERTO') action = 'OPEN';
        else if (curr === 'FECHADO') action = 'CLOSE';
      }
      await addAuditLogSystem({
        action,
        resource: 'volumes',
        resourceId: String(doc._id),
        payload: null,
        changes
      });
    }
  } catch (e) { void e; }
});

export const Volume = mongoose.model('Volume', VolumeSchema);
