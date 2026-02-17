import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema({
  resource: { type: String, required: true, index: true },
  resourceId: { type: String, required: true, index: true },
  action: { type: String, required: true, index: true }, // CREATE, UPDATE, DELETE, OPEN, CLOSE, ANAC_SYNC, RECTIFY
  user: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String },
    role: { type: String }
  },
  changes: [{
    field: { type: String },
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed
  }],
  justification: { type: String },
  metadata: {
    ip: { type: String },
    userAgent: { type: String },
    route: { type: String },
    statusCode: { type: Number }
  },
  // Campos legados para compatibilidade com UI/serviços atuais
  method: { type: String },
  statusCode: { type: Number },
  userLegacy: { type: String },
  ip: { type: String },
  ua: { type: String },
  payload: { type: Object },
  oldValue: { type: Object },
  newValue: { type: Object },
  // Integridade
  prevHash: { type: String },
  hash: { type: String }
}, { timestamps: { createdAt: true, updatedAt: false }, versionKey: false });

AuditLogSchema.index({ resource: 1, resourceId: 1, createdAt: -1 });
AuditLogSchema.index({ resource: 1, action: 1, createdAt: -1 }, { partialFilterExpression: { resource: 'logs' } });
AuditLogSchema.index({ action: 1, createdAt: -1 }, { partialFilterExpression: { action: 'RECTIFY' } });

export const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
