import mongoose from 'mongoose';
import { ComplianceItem } from '../../models/complianceItem.js';

export class ComplianceRepository {
  async list() {
    if (mongoose.connection.readyState !== 1) {
      return [];
    }
    return ComplianceItem.find().lean();
  }
  async create(data) {
    if (mongoose.connection.readyState !== 1) {
      return { ...data, _id: 'local-compliance' };
    }
    const doc = await ComplianceItem.create(data);
    return doc.toObject();
  }
  async deleteById(id) {
    if (mongoose.connection.readyState !== 1) {
      return true;
    }
    const res = await ComplianceItem.findByIdAndDelete(id);
    return !!res;
  }
}
