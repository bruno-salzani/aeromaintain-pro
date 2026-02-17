import mongoose from 'mongoose';
import { addAuditLogSystem } from '../services/auditService.js';

const ComplianceItemSchema = new mongoose.Schema({
  type: { type: String, enum: ['AD', 'DA', 'SB'], required: true },
  referenceNumber: String,
  description: String,
  applicableTo: String,
  ata: String,
  effectiveDate: String,
  lastPerformedDate: String,
  lastPerformedHours: Number,
  nextDueHours: Number,
  nextDueDate: String,
  status: { type: String, enum: ['CUMPRIDA', 'PENDENTE', 'REPETITIVA'], default: 'PENDENTE' },
  notes: String
}, { timestamps: true });

ComplianceItemSchema.pre('save', async function(next) {
  try {
    if (!this.isNew) {
      const orig = await mongoose.model('ComplianceItem').findById(this._id).lean();
      this.$locals = this.$locals || {};
      this.$locals.original = orig || {};
    }
    next();
  } catch (e) {
    void e;
    next();
  }
});

ComplianceItemSchema.post('save', async function(doc) {
  try {
    const original = (this.$locals && this.$locals.original) || {};
    const fields = ['status', 'lastPerformedDate', 'lastPerformedHours', 'nextDueHours', 'nextDueDate', 'notes', 'type', 'referenceNumber', 'description', 'ata'];
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
        resource: 'compliance',
        resourceId: String(doc._id),
        payload: null,
        changes
      });
    }
  } catch (e) { void e; }
});

export const ComplianceItem = mongoose.model('ComplianceItem', ComplianceItemSchema);
