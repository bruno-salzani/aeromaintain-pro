import mongoose from 'mongoose';
import { addAuditLogSystem } from '../services/auditService.js';

const TaskSchema = new mongoose.Schema({
  aircraftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Aircraft', required: true },
  ata: String,
  description: String,
  intervalHours: Number,
  intervalCycles: Number,
  intervalDays: Number,
  lastDoneDate: String,
  lastDoneHours: Number,
  nextDueHours: Number,
  nextDueDate: String,
  linkedComponentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Component' },
  isComplianceItem: { type: Boolean, default: false }
}, { timestamps: true });

TaskSchema.pre('save', async function(next) {
  try {
    if (!this.isNew) {
      const orig = await mongoose.model('Task').findById(this._id).lean();
      this.$locals = this.$locals || {};
      this.$locals.original = orig || {};
    }
    next();
  } catch (e) {
    void e;
    next();
  }
});

TaskSchema.post('save', async function(doc) {
  try {
    const original = (this.$locals && this.$locals.original) || {};
    const fields = ['description', 'intervalHours', 'intervalCycles', 'intervalDays', 'lastDoneDate', 'lastDoneHours', 'nextDueHours', 'nextDueDate', 'linkedComponentId'];
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
        resource: 'tasks',
        resourceId: String(doc._id),
        payload: null,
        changes
      });
    }
  } catch (e) { void e; }
});

export const Task = mongoose.model('Task', TaskSchema);
