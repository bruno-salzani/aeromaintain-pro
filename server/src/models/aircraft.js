import mongoose from 'mongoose';
import { addAuditLogSystem } from '../services/auditService.js';

const AircraftSchema = new mongoose.Schema({
  registration: { type: String, required: true, unique: true },
  msn: String,
  model: String,
  manufactureYear: Number,
  totalHours: { type: Number, default: 0 },
  totalCycles: { type: Number, default: 0 },
  nextIAMDate: String,
  validityCA: String,
  status: { type: String, enum: ['ATIVO', 'PARADO', 'MANUTENCAO'], default: 'ATIVO' }
}, { timestamps: true });

AircraftSchema.pre('save', async function(next) {
  try {
    if (!this.isNew) {
      const orig = await mongoose.model('Aircraft').findById(this._id).lean();
      this.$locals = this.$locals || {};
      this.$locals.original = orig || {};
    }
    next();
  } catch (e) {
    void e;
    next();
  }
});

AircraftSchema.post('save', async function(doc) {
  try {
    const original = (this.$locals && this.$locals.original) || {};
    const fields = ['totalHours', 'totalCycles', 'nextIAMDate', 'validityCA', 'status'];
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
        action: this.isNew ? 'CREATE' : 'UPDATE',
        resource: 'aircraft',
        resourceId: String(doc._id),
        payload: null,
        changes
      });
    }
  } catch (e) { void e; }
});

export const Aircraft = mongoose.model('Aircraft', AircraftSchema);
