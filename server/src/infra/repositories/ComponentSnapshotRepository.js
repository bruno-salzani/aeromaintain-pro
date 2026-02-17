import { ComponentSnapshot } from '../../models/componentSnapshot.js';
import mongoose from 'mongoose';

export class ComponentSnapshotRepository {
  async create(data) {
    if (mongoose.connection.readyState !== 1) {
      return { _id: 'local-snap', ...data };
    }
    const doc = await ComponentSnapshot.create(data);
    return doc.toObject();
  }
}
