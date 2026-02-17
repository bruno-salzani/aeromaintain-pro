import mongoose from 'mongoose';
import { addAuditLogSystem } from '../services/auditService.js';

const ComponentSchema = new mongoose.Schema({
  aircraftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Aircraft', required: true },
  pn: String,
  sn: String,
  description: String,
  installedDate: String,
  installedHours: Number,
  installedCycles: Number,
  lifeLimitHours: Number,
  lifeLimitCycles: Number,
  calendarLimitDays: Number,
  remainingHours: Number,
  remainingDays: Number,
  status: { type: String, enum: ['OK', 'VENCIDO', 'EM_MANUTENCAO', 'REMOVIDO', 'CRITICO'], default: 'OK' },
  ata: String
}, { timestamps: true });

ComponentSchema.pre('save', async function(next) {
  try {
    if (!this.isNew) {
      const orig = await mongoose.model('Component').findById(this._id).lean();
      this.$locals = this.$locals || {};
      this.$locals.original = orig || {};
    }
    next();
  } catch (e) {
    void e;
    next();
  }
});

ComponentSchema.post('save', async function(doc) {
  try {
    const original = (this.$locals && this.$locals.original) || {};
    const fields = ['remainingHours', 'status', 'pn', 'sn', 'installedHours', 'installedCycles', 'lifeLimitHours', 'lifeLimitCycles'];
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
        resource: 'components',
        resourceId: String(doc._id),
        payload: null,
        changes
      });
    }
  } catch (e) { void e; }
});

export const Component = mongoose.model('Component', ComponentSchema);
