import mongoose from 'mongoose';

const ComponentSnapshotSchema = new mongoose.Schema({
  componentId: { type: String, required: true },
  remainingHours: { type: Number },
  status: { type: String },
  timestamp: { type: Date, default: () => new Date() },
  meta: { type: Object }
}, { timestamps: true });

export const ComponentSnapshot = mongoose.models.ComponentSnapshot || mongoose.model('ComponentSnapshot', ComponentSnapshotSchema);
